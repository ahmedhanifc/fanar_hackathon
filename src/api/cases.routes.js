const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs').promises;

const { CaseConversationManager } = require('../core/case_conversation.js');
const { CASE_TYPES } = require('../core/case_structure.js');
const { ReportGenerator } = require('../core/report_generator.js');

// Store active conversations (in production, use a database)
const activeConversations = new Map();

// Cleanup old conversations (older than 24 hours)
const cleanupOldConversations = () => {
    const now = Date.now();
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
    
    for (const [conversationId, conversationManager] of activeConversations.entries()) {
        const conversationAge = now - parseInt(conversationId);
        if (conversationAge > maxAge) {
            activeConversations.delete(conversationId);
            console.log(`Cleaned up old conversation: ${conversationId}`);
        }
    }
};

// Run cleanup every hour
setInterval(cleanupOldConversations, 60 * 60 * 1000);

// @route   POST /api/cases/start
// @desc    Start a new case conversation
// @access  Public
router.post('/start', async (req, res) => {
    try {
        const { caseType, language = 'english' } = req.body;
        
        // Validate case type
        if (!caseType || !Object.values(CASE_TYPES).includes(caseType)) {
            return res.status(400).json({ 
                error: 'Valid caseType is required. Options: consumer_complaint, traffic_accident' 
            });
        }

        // Validate language
        if (!['english', 'arabic'].includes(language)) {
            return res.status(400).json({ 
                error: 'Valid language is required. Options: english, arabic' 
            });
        }

        const conversationManager = new CaseConversationManager(language);
        const startResponse = await conversationManager.startCase(caseType);
        
        // Use the conversation ID from the manager for consistency
        const conversationId = conversationManager.currentCase.id;
        activeConversations.set(conversationId, conversationManager);
        
        res.json({
            success: true,
            conversationId: conversationId,
            message: startResponse.message,
            options: startResponse.options,
            caseType: caseType,
            language: language
        });

    } catch (error) {
        console.error('Error starting case:', error);
        res.status(500).json({ 
            error: 'Failed to start case conversation',
            details: error.message 
        });
    }
});

// @route   POST /api/cases/chat
// @desc    Continue a case conversation
// @access  Public
router.post('/chat', async (req, res) => {
    try {
        const { conversationId, message } = req.body;

        if (!conversationId || !message) {
            return res.status(400).json({ 
                error: 'conversationId and message are required.' 
            });
        }

        const conversationManager = activeConversations.get(conversationId);
        
        if (!conversationManager) {
            return res.status(404).json({ 
                error: 'Conversation not found. Please start a new case.',
                conversationId: conversationId
            });
        }

        // Process the user's response
        const response = await conversationManager.processUserResponse(message);
        
        // If case is complete, remove from active conversations
        if (response.isComplete) {
            activeConversations.delete(conversationId);
            console.log(`Completed conversation: ${conversationId}`);
        }

        res.json({
            success: true,
            conversationId: conversationId,
            message: response.message,
            options: response.options,
            isComplete: response.isComplete,
            caseData: response.caseData || null,
            caseType: conversationManager.currentCase.caseType
        });

    } catch (error) {
        console.error('Error processing chat:', error);
        res.status(500).json({ 
            error: 'Failed to process message',
            details: error.message 
        });
    }
});

// @route   POST /api/cases/generate-report
// @desc    Generate a report for a completed case
// @access  Public
router.post('/generate-report', async (req, res) => {
    try {
        const { caseData, language = 'english' } = req.body;
        
        if (!caseData) {
            return res.status(400).json({ 
                error: 'caseData is required.' 
            });
        }

        // Validate language
        if (!['english', 'arabic'].includes(language)) {
            return res.status(400).json({ 
                error: 'Valid language is required. Options: english, arabic' 
            });
        }

        // Validate case data structure
        if (!caseData.caseType || !Object.values(CASE_TYPES).includes(caseData.caseType)) {
            return res.status(400).json({ 
                error: 'Invalid case data: missing or invalid caseType' 
            });
        }

        // Flatten caseData if it has a .data property
        let flatCaseData = caseData;
        if (caseData.data && typeof caseData.data === 'object') {
            flatCaseData = { ...caseData, ...caseData.data };
            delete flatCaseData.data;
        }

        const reportGenerator = new ReportGenerator();
        const report = await reportGenerator.generateReport(flatCaseData, language);
        const filename = reportGenerator.generateFilename(flatCaseData, language);
        const filepath = await reportGenerator.saveReport(report, filename);
        
        res.json({
            success: true,
            report: report,
            filename: filename,
            filepath: filepath,
            downloadUrl: `/api/cases/download-report/${encodeURIComponent(filename)}`
        });

    } catch (error) {
        console.error('Error generating report:', error);
        res.status(500).json({ 
            error: 'Failed to generate report',
            details: error.message 
        });
    }
});

// @route   GET /api/cases/download-report/:filename
// @desc    Download a generated report
// @access  Public
router.get('/download-report/:filename', async (req, res) => {
    try {
        const { filename } = req.params;
        
        // Security: Validate filename to prevent directory traversal
        const sanitizedFilename = path.basename(filename);
        if (sanitizedFilename !== filename) {
            return res.status(400).json({ 
                error: 'Invalid filename' 
            });
        }
        
        // Only allow .txt files
        if (!sanitizedFilename.endsWith('.txt')) {
            return res.status(400).json({ 
                error: 'Invalid file type. Only .txt files are allowed.' 
            });
        }
        
        const filepath = path.join(__dirname, '../../reports', sanitizedFilename);
        
        // Check if file exists
        try {
            await fs.access(filepath);
        } catch (error) {
            return res.status(404).json({ 
                error: 'Report not found.',
                filename: sanitizedFilename
            });
        }
        
        // Set headers for file download
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="${sanitizedFilename}"`);
        
        // Stream the file
        const fileStream = require('fs').createReadStream(filepath);
        fileStream.pipe(res);
        
    } catch (error) {
        console.error('Error downloading report:', error);
        res.status(500).json({ 
            error: 'Failed to download report',
            details: error.message 
        });
    }
});

// @route   GET /api/cases/types
// @desc    Get available case types
// @access  Public
router.get('/types', (req, res) => {
    res.json({
        success: true,
        caseTypes: Object.values(CASE_TYPES),
        descriptions: {
            consumer_complaint: "Issues with products or services purchased",
            traffic_accident: "Vehicle-related incidents and accidents"
        },
        languages: {
            english: "English",
            arabic: "العربية"
        }
    });
});

// @route   GET /api/cases/status/:conversationId
// @desc    Get status of an active conversation
// @access  Public
router.get('/status/:conversationId', (req, res) => {
    try {
        const { conversationId } = req.params;
        const conversationManager = activeConversations.get(conversationId);
        
        if (!conversationManager) {
            return res.status(404).json({ 
                error: 'Conversation not found.',
                conversationId: conversationId
            });
        }

        res.json({
            success: true,
            conversationId: conversationId,
            caseType: conversationManager.currentCase?.caseType,
            language: conversationManager.language,
            status: conversationManager.currentCase?.status,
            isActive: true
        });

    } catch (error) {
        console.error('Error getting conversation status:', error);
        res.status(500).json({ 
            error: 'Failed to get conversation status',
            details: error.message 
        });
    }
});

// @route   GET /api/cases/active-conversations
// @desc    Get count of active conversations (for debugging)
// @access  Public
router.get('/active-conversations', (req, res) => {
    res.json({
        success: true,
        count: activeConversations.size,
        conversationIds: Array.from(activeConversations.keys())
    });
});

module.exports = router; 