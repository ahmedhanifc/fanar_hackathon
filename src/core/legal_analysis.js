const { getFanarChatCompletion } = require('./fanar_service');

/**
 * Generate comprehensive legal analysis from case data
 */
async function generateLegalAnalysis(caseData, caseType) {
    // Format the case data into readable text
    const caseInfo = Object.entries(caseData)
        .map(([key, value]) => `${key}: ${value}`)
        .join('\n');

    const legalPrompt = `
You are a Qatari legal expert providing analysis for a ${caseType.replace('_', ' ').toLowerCase()} case.

Case Details:
${caseInfo}

Please provide:

1. **Legal Assessment**: Analyze what happened from a legal perspective
2. **Applicable Laws**: Cite specific Qatari laws and articles that apply
3. **Your Rights**: Explain the victim's legal rights and protections
4. **Recommended Actions**: Suggest immediate steps to take
5. **Options Available**: Present clear options for the user

Format your response with empathy and authority. Include specific legal references where possible. End with these options:

**What would you like to do next?**
• Get help contacting relevant authorities
• Receive a formal legal document
• Connect with a qualified lawyer
• Learn about similar cases and outcomes
• Get guidance on evidence collection

Be professional yet empathetic. This person has been through a difficult experience.
`;

    try {
        const messagesArray = [
            { role: "system", content: legalPrompt },
            { role: "user", content: `Please analyze this case and provide legal guidance.` }
        ];
        
        const analysis = await getFanarChatCompletion(messagesArray);
        return analysis;
        
    } catch (error) {
        console.error('Error generating legal analysis:', error);
        throw error;
    }
}

module.exports = {
    generateLegalAnalysis
};