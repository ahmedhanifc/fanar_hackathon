const { getFanarChatCompletion } = require('./fanar_service');
const fs = require('fs');
const path = require('path');

/**
 * Generate comprehensive legal analysis from case data
 */
async function generateLegalAnalysis(caseData, caseType) {
    // Format the case data into readable text
    const caseInfo = Object.entries(caseData)
        .map(([key, value]) => `${key}: ${value}`)
        .join('\n');
    
    // Read relevant legal texts based on case type
    let qatarLegalTexts = '';
    
    // Map case types to relevant legal text files
    const legalTextMap = {
        'FRAUD': ['law_13.txt', 'consumer_protection.txt'],
        'DATA_BREACH': ['law_13.txt', 'cybercrime_law.txt'],
        'DEFAULT': ['law_13.txt']
    };
    
    // Get the list of legal texts to load for this case type
    const textsToLoad = legalTextMap[caseType] || legalTextMap['DEFAULT'];
    
    // Load and combine all relevant legal texts
    try {
        for (const textFile of textsToLoad) {
            const legalTextPath = path.join(__dirname, '..', '..', 'legal_texts', textFile);
            if (fs.existsSync(legalTextPath)) {
                const text = fs.readFileSync(legalTextPath, 'utf8');
                qatarLegalTexts += text + '\n\n';
            }
        }
    } catch (err) {
        console.warn('Warning: Could not read legal text file:', err.message);
    }

    const legalPrompt = `
You are a Qatari legal expert providing analysis for a ${caseType.replace('_', ' ').toLowerCase()} case.

Case Details:
${caseInfo}

Reference these relevant Qatari legal texts in your analysis:
${qatarLegalTexts}

Please provide:

1. **Legal Assessment**: Analyze what happened from a legal perspective
2. **Applicable Laws**: Cite specific Qatari laws and articles that apply. Format each law reference as "According to [Law Name], Article [Number]:" followed by the relevant text.
3. **Your Rights**: Explain the victim's legal rights and protections, citing specific laws
4. **Recommended Actions**: Suggest immediate steps to take
5. **Options Available**: Present clear options that YOU can help with right now

Format your response with empathy and authority. For each option, start with "I can help you:" and explain exactly what you can do.

End with these actionable options:

**What would you like me to do next?**
• I can help you draft a message to relevant authorities
• I can generate a formal legal document for your case
• I can provide contact information for qualified lawyers
• I can show you similar cases and their outcomes
• I can guide you through evidence collection steps

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