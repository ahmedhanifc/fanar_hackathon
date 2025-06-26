const express = require('express');
const router = express.Router();
const { getFanarChatCompletion } = require("../core/fanar_service");
const { createMessagesArray } = require("../core/system_prompts");
const CaseConversationManager = require("../core/case_conversation");
const { CASE_TYPES } = require("../core/case_structure");
const { detectUserIntent, INTENTS } = require("../core/intent_detection");
const ConversationManager = require("../core/conversation_manager");

// Store active conversations (in production, use a database)
const activeConversations = new Map();
const conversationManager = new ConversationManager();


router.post('/message', async (req, res) => {
    try {
        const { message, promptType = 'INITIAL_CONSULTATION', conversationId = 'default-session' } = req.body;
        
        if (!message) {
            return res.status(400).json({ error: 'Message is required' });
        }

        
        // Get conversation state
        const conversation = conversationManager.getConversation(conversationId);
        
        let fanarResponse;
        let showReportPrompt = false;

        if (conversation.mode === 'GENERATIVE') {
            // Check if user wants to start report
            const userIntent = await detectUserIntent(message);
            
            if (userIntent === INTENTS.START_REPORT) {
                // User wants to start report process
                conversationManager.updateConversation(conversationId, { mode: 'REPORT' });
                fanarResponse = "Great! I'll help you create a detailed report. This will help us understand your situation better and provide more targeted assistance. Let's start with the basics - can you describe what happened in your own words?";
            } else {
                // Continue with normal generative chat
                const messagesArray = createMessagesArray(message, promptType);
                fanarResponse = await getFanarChatCompletion(messagesArray);
                
                // Check if we should show report prompt
                conversation.messageCount++;
                if (conversationManager.shouldShowReportPrompt(conversation)) {
                    showReportPrompt = true;
                }
            }
        } else if (conversation.mode === 'REPORT') {
            // Handle report mode (placeholder for now)
            fanarResponse = "Thank you for that information. Report mode is under development. For now, I can continue helping you in chat mode.";
            // Reset to generative mode for now
            conversationManager.updateConversation(conversationId, { mode: 'GENERATIVE' });
        }

        // Add report prompt if needed
        if (showReportPrompt) {
            fanarResponse += "\n\n---\n📋 Would you like to start a detailed case report? This will help me provide more specific guidance for your situation.";
        }

        res.json({
            userMessage: message,
            botResponse: fanarResponse,
            conversationMode: conversation.mode,
            showReportPrompt: showReportPrompt,
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('Chat error:', error);
        res.status(500).json({ error: 'Failed to process message' });
    }
});

module.exports = router;