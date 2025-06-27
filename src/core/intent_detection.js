const { getFanarChatCompletion } = require('./fanar_service');

// Define possible intents
const INTENTS = {
    CONTINUE_CHAT: 'CONTINUE_CHAT',
    START_REPORT: 'START_REPORT'
};

/**
 * Detect if user wants to start the report process or continue chatting
 * @param {string} userMessage - The user's message
 * @returns {Promise<string>} - Returns CONTINUE_CHAT or START_REPORT
 */
async function detectUserIntent(userMessage) {
    const intentPrompt = `
        You are an intent classifier. Analyze the user's message and determine if they want to:

        1. CONTINUE_CHAT - They want to keep talking/asking questions
        2. START_REPORT - They want to begin the formal report process

        User message: "${userMessage}"

        Examples of START_REPORT (look for positive responses about starting/beginning):
        - "Yes, I want to start the report"
        - "Yes i want to start on the repot" (even with typos)
        - "Let's begin the process"
        - "I'm ready to start"
        - "Yes, please help me with the report"
        - "Sure, let's do it"
        - "Yes"
        - "Okay"
        - "Sure"
        - "Let's start"
        - "Begin"

        Examples of CONTINUE_CHAT:
        - "Tell me more about that"
        - "What else should I know?"
        - "I have another question"
        - "Not yet, I want to understand more"
        - "No"
        - "Not now"

        Be generous with START_REPORT - if the user shows ANY indication of wanting to proceed or start something, choose START_REPORT.

        Respond with ONLY: CONTINUE_CHAT or START_REPORT
        `;

    // Also add a simple keyword fallback
    const lowerMessage = userMessage.toLowerCase();
    const startKeywords = ['yes', 'start', 'begin', 'proceed', 'ready', 'sure', 'okay', 'ok'];
    const continueKeywords = ['no', 'not yet', 'more', 'tell me', 'what else', 'question'];
    
    // Simple keyword detection as backup
    if (startKeywords.some(keyword => lowerMessage.includes(keyword))) {
        console.log('Keyword detection: START_REPORT');
        return INTENTS.START_REPORT;
    }
    
    try {
        const messagesArray = [
            { role: "system", content: intentPrompt },
            { role: "user", content: userMessage }
        ];
        
        const response = await getFanarChatCompletion(messagesArray);
        const intent = response.trim().toUpperCase();
        
        console.log(`Intent detection result: ${intent} for message: "${userMessage}"`);
        
        // Validate response
        if (Object.values(INTENTS).includes(intent)) {
            return intent;
        } else {
            console.warn(`Invalid intent detected: ${intent}, defaulting to CONTINUE_CHAT`);
            return INTENTS.CONTINUE_CHAT;
        }
        
    } catch (error) {
        console.error('Error detecting intent:', error);
        // Default to continue chat if intent detection fails
        return INTENTS.CONTINUE_CHAT;
    }
}

module.exports = {
    detectUserIntent,
    INTENTS
};