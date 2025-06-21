const express = require('express');
const router = express.Router();

const { getFanarChatCompletion } = require("../core/fanar_service")
const { CaseConversationManager } = require("../core/case_conversation.js");
const { CASE_TYPES } = require("../core/case_structure.js");

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

// @route   POST /api/chat/start-case
// @desc    Start a new case conversation
// @access  Public
router.post("/start-case", async (req, res) => {

    // Example:
    // {
    //     "caseType": "cat_case",
    //     "language": "english"
    // }
    try {
        const { caseType, language = 'english' } = req.body;
        const conversationManager = new CaseConversationManager();
        conversationManager.language = language;
        const startResponse = await conversationManager.startCase(caseType);
        
        // Use the conversation ID from the manager
        const conversationId = conversationManager.currentCase.id;
        activeConversations.set(conversationId, conversationManager);
        
        res.json({
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

// @route   POST /api/chat
// @desc    Handles chat messages and gets a response from Fanar
// @access  Public
router.post("/chat", async (req, res) => {
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

        // Process the user's response through the structured conversation
        const response = await conversationManager.processUserResponse(message);
        
        // If case is complete, remove from active conversations
        if (response.isComplete) {
            activeConversations.delete(conversationId);
            console.log(`Completed conversation: ${conversationId}`);
        }

        res.json({
            conversationId: conversationId,
            message: response.message,
            options: response.options,
            isComplete: response.isComplete,
            caseData: response.caseData || null,
            caseType: conversationManager.currentCase.caseType
        });

    } catch (error) {
        console.error('Error processing chat message:', error);
        res.status(500).json({ 
            error: 'Failed to process message',
            details: error.message 
        });
    }
});

// @route   POST /api/chat/legacy
// @desc    Legacy chat endpoint (your original implementation)
// @access  Public
router.post("/legacy", async (req, res) => {
    try {
        const { history, newMessage } = req.body;

        if (!newMessage) {
            return res.status(400).json({ error: 'newMessage is required.' });
        }

        const messagesForFanar = [...history, { role: 'user', content: newMessage }];
        const botReply = await getFanarChatCompletion(messagesForFanar);
        
        res.json({ reply: botReply });

    } catch (error) {
        console.error('Error in legacy chat:', error);
        res.status(500).json({ 
            error: 'Failed to process legacy chat',
            details: error.message 
        });
    }
});

// @route   GET /api/chat/case-types
// @desc    Get available case types
// @access  Public
router.get("/case-types", (req, res) => {
    res.json({
        caseTypes: ['cat_case'],
        descriptions: {
            cat_case: "Cat-related mystery or issue"
        },
        languages: {
            english: "English"
        }
    });
});

// @route   GET /api/chat/active-conversations
// @desc    Get count of active conversations (for debugging)
// @access  Public
router.get("/active-conversations", (req, res) => {
    res.json({
        count: activeConversations.size,
        conversationIds: Array.from(activeConversations.keys())
    });
});

module.exports = router;