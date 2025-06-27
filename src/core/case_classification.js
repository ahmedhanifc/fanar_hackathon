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
    You are a legal-case classifier for Qatar.

    Available case types (return exactly one, uppercase):
    PHISHING_SMS | GENERAL

    Respond with ONLY the case type.  
    If no single category is >50 % confident, return GENERAL.

    User description:
    "${userMessages}"
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