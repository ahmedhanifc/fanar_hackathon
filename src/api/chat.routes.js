const express = require('express');
const router = express.Router();
const { getFanarChatCompletion, processFanarImageApi } = require("../core/fanar_service");
const { createMessagesArray } = require("../core/system_prompts");
const CaseConversationManager = require("../core/case_conversation");
const { CASE_TYPES } = require("../core/case_structure");
const { detectUserIntent, INTENTS } = require("../core/intent_detection");
const ConversationManager = require("../core/conversation_manager");
const { classifyCase } = require("../core/case_classification");
const { generateLegalAnalysis } = require("../core/legal_analysis");
const { streamFanarChatCompletion, streamLegalAnalysis } = require("../core/streaming_service");
const multer = require('multer');
const fs = require('fs');
const path = require('path');
// Store active conversations (in production, use a database)
const activeConversations = new Map();
const conversationManager = new ConversationManager();


const LEGAL_REPORT_PROMPTS = [
    "I can help you formulate a legal report. This might help you better understand your situation as well.",
    "Would you like me to help you create a detailed legal report about your situation?",
    "Creating a structured legal report could provide clarity on your case. Shall we start one?",
    "I can guide you through creating a comprehensive legal document for your situation.",
    "A formal legal report might help organize the details of your case. Would you be interested?",
    "Let me help you document your case properly with a detailed legal report.",
    "Would you like to create a structured legal analysis of your situation?"
];

function getRandomReportPrompt() {
    return LEGAL_REPORT_PROMPTS[Math.floor(Math.random() * LEGAL_REPORT_PROMPTS.length)];
}


// Set up multer for file storage
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadDir = path.join(__dirname, '../../uploads');
        // Create directory if it doesn't exist
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname);
    }
});

// File filter to accept only images
const fileFilter = (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
        cb(null, true);
    } else {
        cb(new Error('Not an image! Please upload an image.'), false);
    }
};

const upload = multer({ 
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    },
    fileFilter: fileFilter
});

router.post('/message', async (req, res) => {
    console.log("Hello from chat message route");
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


router.post('/stream', express.json({limit: '20mb'}), async (req, res) => {
    try {
        const { message, imageData, promptType = 'INITIAL_CONSULTATION', conversationId = 'default-session' } = req.body;
        
        // Allow sending only image without text message
        if (!message && !imageData) {
            return res.status(400).json({ error: 'Either message or image is required' });
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
        
        // Process image if present
        let imageAnalysisResult = null;
        if (imageData) {
            try {
                // Extract base64 data from data URL if present
                const base64Data = imageData.split(',')[1] || imageData;
                
                // Send initial acknowledgment about the image
                res.write(`data: ${JSON.stringify({ type: 'token', content: "I've received your image. " })}\n\n`);
                res.write(`data: ${JSON.stringify({ type: 'token', content: "Let me analyze it. " })}\n\n`);
                
                // Process the image with FANAR API
                imageAnalysisResult = await processFanarImage(base64Data);
                
                // Send image analysis as the first part of the response
                res.write(`data: ${JSON.stringify({ 
                    type: 'token', 
                    content: "Based on the image you've shared, I can see: " 
                })}\n\n`);
                
                // Stream the analysis results word by word
                const words = imageAnalysisResult.split(' ');
                for (let i = 0; i < words.length; i++) {
                    const word = words[i] + (i < words.length - 1 ? ' ' : '');
                    res.write(`data: ${JSON.stringify({ type: 'token', content: word })}\n\n`);
                    // Small delay for streaming effect
                    await new Promise(resolve => setTimeout(resolve, 30));
                }
            } catch (imageError) {
                console.error('Error processing image:', imageError);
                res.write(`data: ${JSON.stringify({ 
                    type: 'token', 
                    content: "I'm having trouble analyzing your image. " 
                })}\n\n`);
            }
        }

        // Now handle the text message if present
        if (message) {
            // If we've already processed an image, add a transition to the message analysis
            if (imageData) {
                res.write(`data: ${JSON.stringify({ 
                    type: 'token', 
                    content: "\n\nRegarding your message: " 
                })}\n\n`);
            }
            
            // Continue with existing message handling logic based on conversation mode
            if (conversation.mode === 'GENERATIVE') {
                let messagesArray;
                if (conversation.caseCompleted && conversation.completedCaseData) {
                    // Handle completed case scenario
                    const contextPrompt = `
                    The user previously completed a case report with these details:
                    ${JSON.stringify(conversation.completedCaseData, null, 2)}
                    
                    ${imageAnalysisResult ? `They shared an image that shows: ${imageAnalysisResult}` : ''}
                    
                    They are now asking: "${message}"
                    
                    Provide helpful guidance based on their specific case details${imageAnalysisResult ? ' and the image they shared' : ''}.
                    `;
                    
                    messagesArray = [
                        { role: "system", content: contextPrompt },
                        { role: "user", content: message }
                    ];
                } else {
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
                            caseType = CASE_TYPES.GENERAL;
                        }
                        
                        // Update conversation with classified case type
                        conversationManager.updateConversation(conversationId, { 
                            mode: 'REPORT',
                            caseType: caseType
                        });
                        
                        // Create new case conversation manager with the classified type
                        const caseManager = new CaseConversationManager();

                        try {
                            const initialResponse = await caseManager.startCase(caseType);
                            activeConversations.set(conversationId, caseManager);

                            const response = `I'll help you create a detailed report. Let's start with some specific questions to gather all the necessary information.\n\n${initialResponse.message}`;
                            
                            // Stream this response character by character
                            await streamText(response, res);
                            
                            // Important: Return early to avoid executing the streaming code below
                            return;
                        }
                        catch (error) {
                            console.error('Error starting case:', error);
                            await streamText("I'm sorry, there was an issue starting your case. Please try again later.", res);
                            return;
                        }
                    } else {
                        // Normal generative chat (existing code)
                        const baseMessagesArray = createMessagesArray(message, promptType);
                        
                        // If we have image analysis, enhance the system prompt
                        if (imageAnalysisResult) {
                            baseMessagesArray[0].content += `\n\nThe user has shared an image that shows: ${imageAnalysisResult}. Consider this information when responding.`;
                        }
                        
                        messagesArray = baseMessagesArray;
                    }    
                }
                
                // Stream the response
                await streamFanarChatCompletion(messagesArray, res);

                const messageCount = (conversation.messageHistory || []).length; // Divide by 2 since we store both user and assistant messages

                if (messageCount >= 1 && messageCount <= 3 && !conversation.caseCompleted) {
                    // Add a small delay before the prompt
                    await new Promise(resolve => setTimeout(resolve, 500));
                    
                    // Add the random prompt
                    const reportPrompt = getRandomReportPrompt();
                    res.write(`data: ${JSON.stringify({ 
                        type: 'token', 
                        content: `\n\n${reportPrompt}` 
                    })}\n\n`);
                }
                // Store message in conversation history
                if (!conversation.messageHistory) conversation.messageHistory = [];
                conversation.messageHistory.push(
                    { role: 'user', content: message + (imageAnalysisResult ? ' [Shared image]' : '') }
                );
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
        } else if (imageAnalysisResult) {
            // If only an image was sent (no text), add a prompt for follow-up
            res.write(`data: ${JSON.stringify({ 
                type: 'token', 
                content: "\n\nIs there anything specific about this document you'd like me to explain?" 
            })}\n\n`);
        }

        // Send final metadata
        res.write(`data: ${JSON.stringify({
            type: 'metadata',
            conversationMode: conversation.mode,
            caseType: conversation.caseType,
            showReportPrompt: false,
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

async function processFanarImage(base64Image) {
    try {
        console.log("Processing image with FANAR API");
        
        // Call the actual FANAR image API function
        const analysisResult = await processFanarImageApi(base64Image);
        
        // Return the analysis from the API
        return analysisResult;
    } catch (error) {
        console.error('Error processing image with FANAR:', error);
        throw new Error('Failed to analyze image content: ' + error.message);
    }
}

module.exports = router;