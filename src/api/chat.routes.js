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
const { generatePhishingReport, generateGeneralReport } = require('../core/report_generator');

const { POST_ANALYSIS_INTENTS, detectPostAnalysisIntent } = require("../core/intent_detection");
const { generateComplaintPDF } = require("../core/generate_pdf");
const { getContactInformation, formatContactInformation } = require("../core/contact_information");



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

router.post('/generate-complaint-pdf', async (req, res) => {
    try {
        const { conversationId = 'default-session' } = req.body;
        
        console.log("Generating PDF for conversation ID:", conversationId);
        
        const conversation = conversationManager.getConversation(conversationId);
        console.log("Conversation object:", JSON.stringify(conversation, null, 2));
        
        if (!conversation) {
            console.log("Conversation not found");
            return res.status(404).json({ error: 'Conversation not found' });
        }
        
        if (!conversation.caseCompleted || !conversation.completedCaseData) {
            console.log("No completed case data found");
            return res.status(400).json({ error: 'No completed case found' });
        }
        
        console.log("Case type:", conversation.caseType);
        console.log("Completed case data:", JSON.stringify(conversation.completedCaseData, null, 2));
        
        // Create a mock case data if data is incomplete
        const caseData = conversation.completedCaseData;
        
        if (!caseData.responses) {
            console.log("Creating mock responses for PDF generation");
            caseData.responses = {
                full_name: "Hiyaam ",
                nationality: "Jordan",
                qatar_id: "12345678",
                email: "hiyam@gmail.com",
                phone_number: "+974 1234 5678",
                incident_date: new Date().toISOString().split('T')[0],
                targeted_account: "Banking Account",
                incident_description: `
                
                    In this phishing SMS case involving Ahmed as a victim, there are significant legal implications under various Qatari laws. The primary concern revolves around Article 13 on Data Protection by Controller and Processor, Article 14 on Breach Notification, and Article 22 on Direct Marketing Via Electronic Communication.
                    Applicable Laws
                    Article 13: While not directly applicable, the principles outlined here set standards that align with personal data protection measures mandated by law.
                    Article 14: This article requires controllers to notify the affected individual and the competent department of any breach, particularly when it could result in serious harm to personal data or privacy.
                    Article 22: This law governs electronic communications for marketing purposes. It explicitly states that such communications must include clear identification of the sender, state the marketing purpose, and offer an accessible method for opting out or revoking consent.
                    Your Rights
                    Based on the given circumstances, Ahmed has several rights:
                    Right to Data Deletion or Erasure: As mentioned in Article 6, victims have the right to request the correction, erasure, or removal of personal data if necessary.
                    Right to be Informed: Under Article 23, Ahmed has the right to receive notifications about personal data processing and its purposes.
                    Right to Access Personal Data: According to Article 6, he has the right to obtain a copy of his personal data for a reasonable fee.
                
                `,
                clicked_link: "Yes",
                entered_info: "Yes",
                official_contact: "Yes", 
                unauthorized_activity: "No",
                reported_to_authorities: "Yes - To Bank"
            };
        }
        
        const pdfBuffer = await generateComplaintPDF(
            caseData, 
            conversation.caseType || 'GENERAL'
        );
        
        // Set headers for PDF download
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename="formal_complaint.pdf"');
        res.setHeader('Content-Length', pdfBuffer.length);
        
        res.send(pdfBuffer);
        
    } catch (error) {
        console.error('PDF generation error:', error);
        res.status(500).json({ error: 'Failed to generate PDF' });
    }
});

router.post('/generate-report', async (req, res) => {
    try {
        const { conversationId = 'default-session' } = req.body;
        
        const conversation = conversationManager.getConversation(conversationId);
        
        if (!conversation.caseCompleted || !conversation.completedCaseData) {
            return res.status(400).json({ error: 'No completed case found' });
        }
        
        let reportMarkdown;
        
        if (conversation.caseType === CASE_TYPES.PHISHING_SMS) {
            reportMarkdown = generatePhishingReport(conversation.completedCaseData);
        } else {
            reportMarkdown = generateGeneralReport(conversation.completedCaseData);
        }
        
        res.json({
            reportMarkdown,
            caseType: conversation.caseType,
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('Report generation error:', error);
        res.status(500).json({ error: 'Failed to generate report' });
    }
});


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
                
                // Send image analysis progress updates
                res.write(`data: ${JSON.stringify({ 
                    type: 'image_progress', 
                    progress: 0, 
                    message: 'Initializing image analysis...' 
                })}\n\n`);
                
                res.write(`data: ${JSON.stringify({ 
                    type: 'image_progress', 
                    progress: 25, 
                    message: 'Processing image data...' 
                })}\n\n`);
                
                res.write(`data: ${JSON.stringify({ 
                    type: 'image_progress', 
                    progress: 50, 
                    message: 'Analyzing image content...' 
                })}\n\n`);
                
                // Process the image with FANAR API
                imageAnalysisResult = await processFanarImage(base64Data);
                
                res.write(`data: ${JSON.stringify({ 
                    type: 'image_progress', 
                    progress: 100, 
                    message: 'Analysis complete!' 
                })}\n\n`);
                
                // Small delay to show completion
                await new Promise(resolve => setTimeout(resolve, 500));
                
                // Send the complete image analysis result instantly (not streamed)
                const fullImageAnalysis = `Based on the image you've shared, I can see: ${imageAnalysisResult}`;
                res.write(`data: ${JSON.stringify({ 
                    type: 'complete_image_analysis', 
                    content: fullImageAnalysis
                })}\n\n`);
                
            } catch (imageError) {
                console.error('Error processing image:', imageError);
                res.write(`data: ${JSON.stringify({ 
                    type: 'token', 
                    content: "I'm having trouble analyzing your image. " 
                })}\n\n`);
            }
        }

        // Now handle the text message if present
        if (message && message.trim()) {
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
                    const postIntent = await detectPostAnalysisIntent(message);
                    
                    if (postIntent === POST_ANALYSIS_INTENTS.FORMAL_COMPLAINT) {
                        const response = `I'll help you create a formal complaint document. This will be a professional PDF that you can submit to the relevant authorities.\n\nClick the "Generate PDF Complaint" button below to download your formal complaint document.`;
                        
                        await streamText(response, res);
                        
                        // Send metadata indicating PDF generation is available
                        res.write(`data: ${JSON.stringify({
                            type: 'action_available',
                            action: 'pdf_complaint',
                            message: 'PDF complaint generation available'
                        })}\n\n`);
                        
                        // Add to conversation history
                        if (!conversation.messageHistory) conversation.messageHistory = [];
                        conversation.messageHistory.push(
                            { role: 'user', content: message },
                            { role: 'assistant', content: response }
                        );
                        
                        // Important: Return early to avoid executing additional streaming
                        return;


                } else if (postIntent === POST_ANALYSIS_INTENTS.CONTACT_INFO) {
                        const contactInfo = getContactInformation(conversation.caseType);
                        const formattedContactInfo = formatContactInformation(contactInfo);
                        
                        const response = `Here are the contact details for relevant government departments:\n\n${formattedContactInfo}\n\nIf you need further assistance, feel free to ask!`;
                        
                        await streamText(response, res);
                        
                        // Add to conversation history
                        if (!conversation.messageHistory) conversation.messageHistory = [];
                        conversation.messageHistory.push(
                            { role: 'user', content: message },
                            { role: 'assistant', content: response }
                        );
                        
                        // Important: Return early to avoid executing additional streaming
                        return;
                    } else {
                        // Handle as normal follow-up question with image analysis included
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
                    }
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
        } else if (imageAnalysisResult && !message) { // Only show this if there's no message
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
        return;
        
    } catch (error) {
        console.error('Streaming chat error:', error);
        res.write(`data: ${JSON.stringify({ type: 'error', message: 'Failed to process message' })}\n\n`);
        res.end();
        return;
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