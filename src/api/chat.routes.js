const express = require('express');
const router = express.Router();
const { getFanarChatCompletion } = require("../core/fanar_service");
const CaseConversationManager = require("../core/case_conversation");
const { CASE_TYPES } = require("../core/case_structure");

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
    try {
        const { caseType, language = 'english' } = req.body;
        
        // Validate case type
        if (!Object.values(CASE_TYPES).includes(caseType)) {
            return res.status(400).json({ 
                error: 'Invalid case type',
                validTypes: Object.values(CASE_TYPES)
            });
        }
        
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

// @route   POST /api/chat/chat
// @desc    Process a message in a structured conversation
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
            options: response.options || [],
            isComplete: response.isComplete || false,
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
// @desc    Legacy chat endpoint for open-ended conversations
// @access  Public
router.post("/legacy", async (req, res) => {
    try {
        const { history, newMessage } = req.body;

        if (!newMessage) {
            return res.status(400).json({ error: 'newMessage is required.' });
        }

        // Create a system message for empathetic legal assistance
        const systemMessage = {
            role: 'system',
            content: `You are Fanar, an empathetic legal assistant specializing in Qatar law. 
            Your primary goal is to provide emotional support and legal guidance to users who may be distressed.
            
            Be compassionate, understanding, and patient. Use a warm, supportive tone.
            When appropriate, ask if the user would like to start a structured case report to get more formal legal advice.
            
            You have knowledge of Qatar's legal system, particularly:
            - Law No. 14 of 2014 on Combating Cybercrimes
            - Decree-Law No. 16 of 2010 on Electronic Transactions and Commerce
            - Law No. 13 of 2016 on Personal Data Protection
            
            Today's date is ${new Date().toLocaleDateString()}.`
        };
        
        // Add system message at the beginning if there's no system message yet
        let messagesForFanar = [];
        let hasSystemMessage = false;
        
        if (history && history.length > 0) {
            hasSystemMessage = history.some(msg => msg.role === 'system');
            messagesForFanar = [...history];
        }
        
        if (!hasSystemMessage) {
            messagesForFanar = [systemMessage, ...messagesForFanar];
        }
        
        // Add the user's new message
        messagesForFanar.push({ role: 'user', content: newMessage });
        
        // Get response from Fanar
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
        caseTypes: Object.values(CASE_TYPES),
        descriptions: {
            [CASE_TYPES.PHISHING_SMS]: "Phishing SMS attack or scam"
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
