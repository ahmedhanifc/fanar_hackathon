const { getFanarChatCompletion } = require('./fanar_service');
const { createMessagesArray } = require('./system_prompts');
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

    const userMessage = `
        Case Type: ${caseType.replace('_', ' ').toLowerCase()}

        Case Details:
        ${caseInfo}

        Reference these relevant Qatari legal texts in your analysis:
        ${qatarLegalTexts}

        Please analyze this case and provide legal guidance.`;

    try {
        const messagesArray = createMessagesArray(userMessage, 'LEGAL_ANALYSIS');
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