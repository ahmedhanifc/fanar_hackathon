const { getFanarChatCompletion } = require('./fanar_service');
const { CASE_TYPES } = require('./case_structure');

/**
 * Classify the user's case based on conversation history
 * @param {Array} conversationHistory - Array of conversation messages
 * @returns {Promise<string>} - Returns a CASE_TYPE or 'GENERAL'
 */
async function classifyCase(conversationHistory) {
    // Extract user messages for context
    const userMessages = conversationHistory
        .filter(msg => msg.role === 'user')
        .map(msg => msg.content)
        .join('\n');

    const classificationPrompt = `
        You are a legal case classifier for Qatar. Analyze the user's description and classify it into one of these categories:

        Available case types:
        - PHISHING_SMS: SMS phishing attacks, fraudulent text messages, clicking malicious links, financial loss from SMS scams
        - GENERAL: Cases that don't fit specific categories or need more information

        User's description:
        "${userMessages}"

        Keywords to look for PHISHING_SMS:
        - PHISHING_SMS: "SMS", "text message", "phishing", "clicked link", "bank details", "OTP", "fraudulent message", "scam text","scam message","scammed","financial loss","money lost","bank account compromised"

        Respond with ONLY the case type (e.g., "PHISHING_SMS" or "GENERAL").
        If unsure or the case involves multiple types, respond with "GENERAL".
    `;

    try {
        const messagesArray = [
            { role: "system", content: classificationPrompt },
            { role: "user", content: userMessages }
        ];
        
        const response = await getFanarChatCompletion(messagesArray);
        const caseType = response.trim().toUpperCase();
        
        console.log(`Case classification result: ${caseType}`);
        
        // Validate response - if not a known case type, default to GENERAL
        if (Object.values(CASE_TYPES).includes(caseType)) {
            return caseType;
        } else {
            console.warn(`Unknown case type classified: ${caseType}, defaulting to GENERAL`);
            return 'GENERAL';
        }
        
    } catch (error) {
        console.error('Error classifying case:', error);
        return 'GENERAL'; // Default fallback
    }
}

module.exports = {
    classifyCase
};