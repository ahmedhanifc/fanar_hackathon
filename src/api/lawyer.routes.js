const express = require('express');
const router = express.Router();
const fs = require('fs').promises;
const path = require('path');

// @route   GET /api/lawyer/cases
// @desc    Get all cases for lawyer dashboard
// @access  Private (for lawyers)
router.get('/cases', async (req, res) => {
    try {
        const { status, caseType, page = 1, limit = 10 } = req.query;
        
        // Read all reports from the reports directory
        const reportsDir = path.join(__dirname, '../../reports');
        let files = [];
        
        try {
            files = await fs.readdir(reportsDir);
        } catch (error) {
            // Reports directory doesn't exist yet
            return res.json({
                cases: [],
                total: 0,
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages: 0
            });
        }
        
        // Parse case data from filenames and content
        const cases = [];
        for (const file of files) {
            if (file.endsWith('.txt')) {
                try {
                    const filepath = path.join(reportsDir, file);
                    const content = await fs.readFile(filepath, 'utf8');
                    
                    // Extract basic info from filename
                    const filenameParts = file.replace('.txt', '').split('-');
                    const caseTypeFromFile = filenameParts[0];
                    const clientName = filenameParts[1];
                    const date = filenameParts[2];
                    const language = filenameParts[3];
                    
                    // Skip if filtering by case type and doesn't match
                    if (caseType && caseTypeFromFile !== caseType) {
                        continue;
                    }
                    
                    // Extract status from content (you can enhance this logic)
                    let status = 'new';
                    if (content.includes('Status: in_progress')) {
                        status = 'in_progress';
                    } else if (content.includes('Status: completed')) {
                        status = 'completed';
                    }
                    
                    // Skip if filtering by status and doesn't match
                    if (status && status !== status) {
                        continue;
                    }
                    
                    cases.push({
                        id: file.replace('.txt', ''),
                        filename: file,
                        caseType: caseTypeFromFile,
                        clientName: clientName,
                        date: date,
                        language: language,
                        status: status,
                        content: content.substring(0, 200) + '...', // Preview
                        fullContent: content,
                        createdAt: new Date(date).toISOString()
                    });
                } catch (error) {
                    console.error(`Error reading file ${file}:`, error);
                }
            }
        }
        
        // Sort by date (newest first)
        cases.sort((a, b) => new Date(b.date) - new Date(a.date));
        
        // Pagination
        const startIndex = (parseInt(page) - 1) * parseInt(limit);
        const endIndex = startIndex + parseInt(limit);
        const paginatedCases = cases.slice(startIndex, endIndex);
        
        res.json({
            cases: paginatedCases,
            total: cases.length,
            page: parseInt(page),
            limit: parseInt(limit),
            totalPages: Math.ceil(cases.length / parseInt(limit))
        });
        
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// @route   GET /api/lawyer/cases/:caseId
// @desc    Get a specific case by ID
// @access  Private (for lawyers)
router.get('/cases/:caseId', async (req, res) => {
    try {
        const { caseId } = req.params;
        const filename = `${caseId}.txt`;
        const filepath = path.join(__dirname, '../../reports', filename);
        
        try {
            const content = await fs.readFile(filepath, 'utf8');
            
            // Extract info from filename
            const filenameParts = caseId.split('-');
            const caseType = filenameParts[0];
            const clientName = filenameParts[1];
            const date = filenameParts[2];
            const language = filenameParts[3];
            
            res.json({
                id: caseId,
                filename: filename,
                caseType: caseType,
                clientName: clientName,
                date: date,
                language: language,
                content: content,
                createdAt: new Date(date).toISOString()
            });
            
        } catch (error) {
            res.status(404).json({ error: 'Case not found.' });
        }
        
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// @route   PUT /api/lawyer/cases/:caseId/status
// @desc    Update case status
// @access  Private (for lawyers)
router.put('/cases/:caseId/status', async (req, res) => {
    try {
        const { caseId } = req.params;
        const { status, notes } = req.body;
        
        if (!status) {
            return res.status(400).json({ error: 'Status is required.' });
        }
        
        const filename = `${caseId}.txt`;
        const filepath = path.join(__dirname, '../../reports', filename);
        
        try {
            let content = await fs.readFile(filepath, 'utf8');
            
            // Update status in the content
            content = content.replace(/Status: .*/, `Status: ${status}`);
            
            // Add lawyer notes if provided
            if (notes) {
                content += `\n\nLawyer Notes (${new Date().toISOString()}):\n${notes}`;
            }
            
            await fs.writeFile(filepath, content, 'utf8');
            
            res.json({
                success: true,
                message: 'Case status updated successfully',
                caseId: caseId,
                status: status
            });
            
        } catch (error) {
            res.status(404).json({ error: 'Case not found.' });
        }
        
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// @route   GET /api/lawyer/dashboard/stats
// @desc    Get dashboard statistics
// @access  Private (for lawyers)
router.get('/dashboard/stats', async (req, res) => {
    try {
        const reportsDir = path.join(__dirname, '../../reports');
        let files = [];
        
        try {
            files = await fs.readdir(reportsDir);
        } catch (error) {
            return res.json({
                totalCases: 0,
                newCases: 0,
                inProgressCases: 0,
                completedCases: 0,
                casesByType: {},
                recentCases: []
            });
        }
        
        let totalCases = 0;
        let newCases = 0;
        let inProgressCases = 0;
        let completedCases = 0;
        const casesByType = {};
        const recentCases = [];
        
        for (const file of files) {
            if (file.endsWith('.txt')) {
                totalCases++;
                
                try {
                    const filepath = path.join(reportsDir, file);
                    const content = await fs.readFile(filepath, 'utf8');
                    
                    // Extract case type
                    const filenameParts = file.replace('.txt', '').split('-');
                    const caseType = filenameParts[0];
                    casesByType[caseType] = (casesByType[caseType] || 0) + 1;
                    
                    // Determine status
                    let status = 'new';
                    if (content.includes('Status: in_progress')) {
                        status = 'in_progress';
                        inProgressCases++;
                    } else if (content.includes('Status: completed')) {
                        status = 'completed';
                        completedCases++;
                    } else {
                        newCases++;
                    }
                    
                    // Add to recent cases (last 5)
                    if (recentCases.length < 5) {
                        recentCases.push({
                            id: file.replace('.txt', ''),
                            caseType: caseType,
                            clientName: filenameParts[1],
                            date: filenameParts[2],
                            status: status
                        });
                    }
                    
                } catch (error) {
                    console.error(`Error reading file ${file}:`, error);
                }
            }
        }
        
        res.json({
            totalCases,
            newCases,
            inProgressCases,
            completedCases,
            casesByType,
            recentCases
        });
        
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router; 