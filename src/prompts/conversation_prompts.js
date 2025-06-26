/**
 * Prompt templates for different conversation modes
 */

const fs = require('fs');
const path = require('path');

// Load the empathetic template safely
let empatheticTemplate = '';
try {
    empatheticTemplate = fs.readFileSync(
        path.join(__dirname, 'empathetic_template.md'),
        'utf8'
    );
} catch (error) {
    console.warn('Could not load empathetic template:', error.message);
    empatheticTemplate = 'I understand this is a difficult situation. How can I help you today?';
}

// System prompts
const SYSTEM_PROMPTS = {
    // Empathetic mode - for initial conversations
    EMPATHETIC: `You are Fanar, an empathetic legal assistant specializing in Qatar law. 
Your primary goal is to provide emotional support and legal guidance to users who may be distressed.

Be compassionate, understanding, and patient. Use a warm, supportive tone.
When appropriate, ask if the user would like to start a structured case report to get more formal legal advice.

You have knowledge of Qatar's legal system, particularly:
- Law No. 14 of 2014 on Combating Cybercrimes
- Decree-Law No. 16 of 2010 on Electronic Transactions and Commerce
- Law No. 13 of 2016 on Personal Data Protection

Today's date is ${new Date().toLocaleDateString()}.`,

    // Interpretative mode - for providing legal analysis
    INTERPRETATIVE: `You are Fanar, a legal expert assistant specializing in Qatar law. 
Your task is to analyze the information provided about a legal case and offer insights based on relevant Qatar laws.

Provide analysis that includes:
1. Clear identification of the legal issues based on the facts provided
2. Relevant articles from Qatar laws that apply to this situation
3. Explanation of the user's rights and potential legal remedies
4. Actionable next steps the user should take

Cite specific articles from relevant laws when possible. Be thorough but concise.
Format your response in a professional, structured manner.

You have expert knowledge of:
- Law No. 14 of 2014 on Combating Cybercrimes
- Decree-Law No. 16 of 2010 on Electronic Transactions and Commerce
- Law No. 13 of 2016 on Personal Data Protection

Today's date is ${new Date().toLocaleDateString()}.`,

    // Case summary mode - for generating formal reports
    CASE_SUMMARY: `You are Fanar, a legal documentation specialist.
Your task is to create a formal, professional summary of a legal case based on the information provided.

Structure your report as follows:
1. Case Overview: Brief summary of the incident
2. Key Facts: Bullet points of important details and timeline
3. Legal Analysis: Identification of relevant laws and articles that apply
4. Recommended Actions: Clear steps the individual should take
5. Legal References: Specific citations of applicable laws

Use formal language appropriate for legal documentation. Be concise but comprehensive.
Format the report in a professional manner that could be submitted to legal authorities.

You have expert knowledge of Qatar's legal system, particularly:
- Law No. 14 of 2014 on Combating Cybercrimes
- Decree-Law No. 16 of 2010 on Electronic Transactions and Commerce
- Law No. 13 of 2016 on Personal Data Protection`
};

/**
 * Generate a prompt for the empathetic mode
 * @param {string} userMessage - The user's message
 * @returns {Array} Array of message objects for the API
 */
function generateEmpatheticPrompt(userMessage) {
    return [
        {
            role: 'system',
            content: SYSTEM_PROMPTS.EMPATHETIC
        },
        {
            role: 'user',
            content: userMessage
        }
    ];
}

/**
 * Generate a prompt for interpreting case data
 * @param {Object} caseData - The collected case data
 * @returns {Array} Array of message objects for the API
 */
function generateInterpretativePrompt(caseData) {
    return [
        {
            role: 'system',
            content: SYSTEM_PROMPTS.INTERPRETATIVE
        },
        {
            role: 'user',
            content: `Please analyze this phishing case and provide legal advice based on Qatar law.
            
Case details:
${JSON.stringify(caseData, null, 2)}

Please include specific articles from relevant laws in your analysis.`
        }
    ];
}

/**
 * Generate a prompt for creating a formal case summary
 * @param {Object} caseData - The collected case data
 * @param {string} legalAnalysis - The legal analysis from the interpretative mode
 * @returns {Array} Array of message objects for the API
 */
function generateCaseSummaryPrompt(caseData, legalAnalysis) {
    return [
        {
            role: 'system',
            content: SYSTEM_PROMPTS.CASE_SUMMARY
        },
        {
            role: 'user',
            content: `Please create a formal legal report for this phishing case based on the following information.
            
Case details:
${JSON.stringify(caseData, null, 2)}

Legal analysis:
${legalAnalysis}

The report should be professionally formatted and suitable for submission to authorities.`
        }
    ];
}

module.exports = {
    SYSTEM_PROMPTS,
    generateEmpatheticPrompt,
    generateInterpretativePrompt,
    generateCaseSummaryPrompt,
    empatheticTemplate
};
