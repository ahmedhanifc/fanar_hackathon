const express = require('express');
const router = express.Router();
const { getFanarChatCompletion } = require("../core/fanar_service");
const { createMessagesArray } = require("../core/system_prompts");
const CaseConversationManager = require("../core/case_conversation");
const { CASE_TYPES } = require("../core/case_structure");
const { detectUserIntent, INTENTS } = require("../core/intent_detection");
const ConversationManager = require("../core/conversation_manager");
const { classifyCase } = require("../core/case_classification");
const { generateLegalAnalysis } = require("../core/legal_analysis");
const { streamFanarChatCompletion, streamLegalAnalysis } = require("../core/streaming_service");


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
            // Check if this is follow-up after completed case
            if (conversation.caseCompleted && conversation.completedCaseData) {
                // User is asking follow-up questions about their completed case
                const contextPrompt = `
                The user previously completed a case report with these details:
                ${JSON.stringify(conversation.completedCaseData, null, 2)}
                
                They are now asking: "${message}"
                
                Provide helpful guidance based on their specific case details.
                `;
                
                const messagesArray = [
                    { role: "system", content: contextPrompt },
                    { role: "user", content: message }
                ];
                
                fanarResponse = await getFanarChatCompletion(messagesArray);
            }
            else{
                const userIntent = await detectUserIntent(message);
                
                if (userIntent === INTENTS.START_REPORT) {
                    // Classify the case before starting report
                    const conversationHistory = conversation.messageHistory || [];
                    conversationHistory.push({ role: 'user', content: message });

                    let caseType;
                    
                    try {
                        caseType = await classifyCase(conversationHistory);
                    } catch (error) {
                        console.error('Classification failed:', error);
                        caseType = CASE_TYPES.GENERAL; // Fallback
                    }
                    
                    // Update conversation with classified case type
                    conversationManager.updateConversation(conversationId, { 
                        mode: 'REPORT',
                        caseType: caseType
                    });
                    
                    // Create new case conversation manager with the classified type
                    const caseManager = new CaseConversationManager();

                    try{
                        const initialResponse = await caseManager.startCase(caseType);;
                        activeConversations.set(conversationId, caseManager);

                        fanarResponse = `I'll help you create a detailed report. Let's start with some specific questions to gather all the necessary information.\n\n${initialResponse.message}`;
                    }
                    catch (error) {
                        console.error('Error starting case:', error);
                        fanarResponse = "I'm sorry, there was an issue starting your case. Please try again later.";    
                    }
                                    
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
            }
        } else if (conversation.mode === 'REPORT') {
            // Handle structured questioning using the case manager
            const caseManager = activeConversations.get(conversationId);
            
            if (caseManager) {
                const response = await caseManager.processUserResponse(message);
                
                if(response.isComplete){
                    const caseData = response.caseData;
                    const caseType = caseManager.getCaseData().caseType;

                    try{
                        const legalAnalysis = await generateLegalAnalysis(caseData, caseType);
                        fanarResponse = legalAnalysis;

                        // Switch back to generative mode for follow-up questions
                        conversationManager.updateConversation(conversationId, { 
                            mode: 'GENERATIVE',
                            caseCompleted: true,
                            completedCaseData: caseData ,
                            caseType:caseType
                        });
                    } catch (error) {
                        console.error('Error generating legal analysis:', error);
                        fanarResponse = "I've collected all your information. Let me analyze your case and provide legal guidance.";
                    }
                }
                else{
                    fanarResponse = response.message;
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


router.post('/stream', async (req, res) => {
    try {
        const { message, promptType = 'INITIAL_CONSULTATION', conversationId = 'default-session' } = req.body;
        
        if (!message) {
            return res.status(400).json({ error: 'Message is required' });
        }

        // Set up SSE headers
        res.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type',
        });

        // Get conversation state
        const conversation = conversationManager.getConversation(conversationId);
        
        let fanarResponse;
        let showReportPrompt = false;

        if (conversation.mode === 'GENERATIVE') {
            // Check if this is follow-up after completed case
            if (conversation.caseCompleted && conversation.completedCaseData) {
                const contextPrompt = `
                The user previously completed a case report with these details:
                ${JSON.stringify(conversation.completedCaseData, null, 2)}
                
                They are now asking: "${message}"
                
                Provide helpful guidance based on their specific case details.
                `;
                
                const messagesArray = [
                    { role: "system", content: contextPrompt },
                    { role: "user", content: message }
                ];
                
                // Stream the response
                await streamFanarChatCompletion(messagesArray, res);
            }
            else{
                const userIntent = await detectUserIntent(message);
                
                if (userIntent === INTENTS.START_REPORT) {
                    // Handle case classification and setup (non-streaming for structured flow)
                    const conversationHistory = conversation.messageHistory || [];
                    conversationHistory.push({ role: 'user', content: message });

                    let caseType;
                    
                    try {
                        caseType = await classifyCase(conversationHistory);
                    } catch (error) {
                        console.error('Classification failed:', error);
                        caseType = CASE_TYPES.GENERAL;
                    }
                    
                    conversationManager.updateConversation(conversationId, { 
                        mode: 'REPORT',
                        caseType: caseType
                    });
                    
                    const caseManager = new CaseConversationManager();

                    try{
                        const initialResponse = await caseManager.startCase(caseType);
                        activeConversations.set(conversationId, caseManager);

                        const response = `I'll help you create a detailed report. Let's start with some specific questions to gather all the necessary information.\n\n${initialResponse.message}`;
                        
                        // Stream this response character by character
                        await streamText(response, res);
                    }
                    catch (error) {
                        console.error('Error starting case:', error);
                        await streamText("I'm sorry, there was an issue starting your case. Please try again later.", res);
                    }
                } else {
                    // Stream normal generative chat
                    const messagesArray = createMessagesArray(message, promptType);
                    await streamFanarChatCompletion(messagesArray, res);
                    
                    // Store message in conversation history
                    if (!conversation.messageHistory) conversation.messageHistory = [];
                    conversation.messageHistory.push(
                        { role: 'user', content: message }
                    );
                }
            }
        } else if (conversation.mode === 'REPORT') {
            // Handle structured questioning
            const caseManager = activeConversations.get(conversationId);
            
            if (caseManager) {
                const response = await caseManager.processUserResponse(message);
                
                if(response.isComplete){
                    const caseData = response.caseData;
                    const caseType = caseManager.getCaseData().caseType;

                    try{
                        // Stream the legal analysis
                        await streamLegalAnalysis(caseData, caseType, res);

                        conversationManager.updateConversation(conversationId, { 
                            mode: 'GENERATIVE',
                            caseCompleted: true,
                            completedCaseData: caseData,
                            caseType: caseType
                        });
                    } catch (error) {
                        console.error('Error generating legal analysis:', error);
                        await streamText("I've collected all your information. Let me analyze your case and provide legal guidance.", res);
                    }
                }
                else{
                    await streamText(response.message, res);
                }

            } else {
                await streamText("I'm sorry, there was an issue with your case session. Let's restart the report process.", res);
                conversationManager.updateConversation(conversationId, { mode: 'GENERATIVE' });
            }
        }

        // Send final metadata
        res.write(`data: ${JSON.stringify({
            type: 'metadata',
            conversationMode: conversation.mode,
            caseType: conversation.caseType,
            showReportPrompt: showReportPrompt,
            timestamp: new Date().toISOString()
        })}\n\n`);

        res.write('data: [DONE]\n\n');
        res.end();
        
    } catch (error) {
        console.error('Streaming chat error:', error);
        res.write(`data: ${JSON.stringify({ type: 'error', message: 'Failed to process message' })}\n\n`);
        res.end();
    }
});

// Helper function to stream text character by character
async function streamText(text, res) {
    const words = text.split(' ');
    for (let i = 0; i < words.length; i++) {
        const word = words[i] + (i < words.length - 1 ? ' ' : '');
        res.write(`data: ${JSON.stringify({ type: 'token', content: word })}\n\n`);
        // Add small delay to simulate streaming
        await new Promise(resolve => setTimeout(resolve, 50));
    }
}

module.exports = router;