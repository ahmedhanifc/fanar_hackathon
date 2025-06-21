const express = require('express');
const router = express.Router();

const { CaseConversationManager } = require('../core/case_conversation.js');
const { CASE_TYPES } = require('../core/case_structure.js');
const { ReportGenerator } = require('../core/report_generator.js');

// Store active conversations (in production, use a database)
const activeConversations = new Map();

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
        
        // Generate unique conversation ID
        const conversationId = Date.now().toString() + Math.random().toString(36).substr(2, 9);
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
        res.status(500).json({ error: error.message });
    }
});

// @route   POST /api/cases/chat
// @desc    Continue a case conversation
// @access  Public
router.post('/chat', async (req, res) => {
    try {
        const { conversationId, message } = req.body;

        if (!conversationId || !message) {
            return res.status(400).json({ error: 'conversationId and message are required.' });
        }

        const conversationManager = activeConversations.get(conversationId);
        
        if (!conversationManager) {
            return res.status(404).json({ error: 'Conversation not found. Please start a new case.' });
        }

        // Process the user's response
        const response = await conversationManager.processUserResponse(message);
        
        // If case is complete, remove from active conversations
        if (response.isComplete) {
            activeConversations.delete(conversationId);
        }

        res.json({
            success: true,
            message: response.message,
            options: response.options,
            isComplete: response.isComplete,
            caseData: response.caseData || null
        });

    } catch (error) {
        console.error('Error processing chat:', error);
        res.status(500).json({ error: error.message });
    }
});

// @route   POST /api/cases/generate-report
// @desc    Generate a report for a completed case
// @access  Public
router.post('/generate-report', async (req, res) => {
    try {
        const { caseData, language = 'english' } = req.body;
        
        if (!caseData) {
            return res.status(400).json({ error: 'caseData is required.' });
        }

        const reportGenerator = new ReportGenerator();
        const report = await reportGenerator.generateReport(caseData, language);
        const filename = reportGenerator.generateFilename(caseData, language);
        const filepath = await reportGenerator.saveReport(report, filename);
        
        res.json({
            success: true,
            report: report,
            filename: filename,
            filepath: filepath,
            downloadUrl: `/api/cases/download-report/${filename}`
        });

    } catch (error) {
        console.error('Error generating report:', error);
        res.status(500).json({ error: error.message });
    }
});

// @route   GET /api/cases/download-report/:filename
// @desc    Download a generated report
// @access  Public
router.get('/download-report/:filename', async (req, res) => {
    try {
        const { filename } = req.params;
        const path = require('path');
        const fs = require('fs').promises;
        
        const filepath = path.join(__dirname, '../../reports', filename);
        
        // Check if file exists
        try {
            await fs.access(filepath);
        } catch (error) {
            return res.status(404).json({ error: 'Report not found.' });
        }
        
        // Set headers for file download
        res.setHeader('Content-Type', 'text/plain');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        
        // Stream the file
        const fileStream = require('fs').createReadStream(filepath);
        fileStream.pipe(res);
        
    } catch (error) {
        console.error('Error downloading report:', error);
        res.status(500).json({ error: error.message });
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
            return res.status(404).json({ error: 'Conversation not found.' });
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
        res.status(500).json({ error: error.message });
    }
});

module.exports = router; 