const express = require('express');
const router = express.Router();
const { getFanarChatCompletion } = require("../core/fanar_service");
const { createMessagesArray } = require("../core/system_prompts");
const CaseConversationManager = require("../core/case_conversation");
const { CASE_TYPES } = require("../core/case_structure");

// Store active conversations (in production, use a database)
const activeConversations = new Map();

router.post('/message', async (req, res) => {
    try {
        const { message, promptType = 'INITIAL_CONSULTATION' } = req.body;
        
        if (!message) {
            return res.status(400).json({ error: 'Message is required' });
        }

        // Create messages array with modular system prompt
        const messagesArray = createMessagesArray(message, promptType);

        // Call Fanar API with properly formatted messages
        const fanarResponse = await getFanarChatCompletion(messagesArray);
        
        res.json({
            userMessage: message,
            botResponse: fanarResponse,
            timestamp: new Date().toISOString(),
            promptUsed: promptType
        });
        
    } catch (error) {
        console.error('Chat error:', error);
        res.status(500).json({ error: 'Failed to process message' });
    }
});

module.exports = router;