const express = require('express');
const router = express.Router();
const { getFanarChatCompletion } = require("../core/fanar_service");
const { createMessagesArray } = require("../core/system_prompts");
const CaseConversationManager = require("../core/case_conversation");
const { CASE_TYPES } = require("../core/case_structure");
const { detectUserIntent, INTENTS } = require("../core/intent_detection");
const ConversationManager = require("../core/conversation_manager");
const { classifyCase } = require("../core/case_classification");


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
                // Classify the case before starting report
                const conversationHistory = conversation.messageHistory || [];
                conversationHistory.push({ role: 'user', content: message });
                
                const caseType = await classifyCase(conversationHistory);
                
                // Update conversation with classified case type
                conversationManager.updateConversation(conversationId, { 
                    mode: 'REPORT',
                    caseType: caseType
                });
                
                // Create new case conversation manager with the classified type
                const caseManager = new CaseConversationManager();
                await caseManager.startCase(caseType);
                
                // Store the case manager in the conversation
                activeConversations.set(conversationId, caseManager);
                
                fanarResponse = `Great! I've identified this as a ${caseType.replace('_', ' ').toLowerCase()} case. I'll help you create a detailed report. Let's start with some specific questions to gather all the necessary information.`;
                
            } else {
                // Continue with normal generative chat
                const messagesArray = createMessagesArray(message, promptType);
                fanarResponse = await getFanarChatCompletion(messagesArray);
                
                // Store message in conversation history
                if (!conversation.messageHistory) conversation.messageHistory = [];
                conversation.messageHistory.push(
                    { role: 'user', content: message },
                    { role: 'assistant', content: fanarResponse }
                );
            }
            
        } else if (conversation.mode === 'REPORT') {
            // Handle structured questioning using the case manager
            const caseManager = activeConversations.get(conversationId);
            
            if (caseManager) {
                const response = await caseManager.processUserResponse(message);
                fanarResponse = response.message;
                
                // Check if case is complete
                if (response.isComplete) {
                    fanarResponse += "\n\nYour case report has been completed. Would you like me to generate a formal document or connect you with a lawyer?";
                }
            } else {
                // Fallback if case manager is lost
                fanarResponse = "I'm sorry, there was an issue with your case session. Let's restart the report process.";
                conversationManager.updateConversation(conversationId, { mode: 'GENERATIVE' });
            }
        }

        res.json({
            userMessage: message,
            botResponse: fanarResponse,
            conversationMode: conversation.mode,
            caseType: conversation.caseType,
            showReportPrompt: showReportPrompt,
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('Chat error:', error);
        res.status(500).json({ error: 'Failed to process message' });
    }
});

module.exports = router;