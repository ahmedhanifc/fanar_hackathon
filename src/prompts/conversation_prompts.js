// Prompts and messages for CaseConversationManager

const languageInstructions = {
    english: 'Always respond in English',
    arabic: 'Always respond in Arabic'
};

const skipPrefixes = {
    english: "No problem, let's continue. ",
    arabic: "لا بأس، دعنا نتابع. "
};

const summaryMessages = {
    english: "Thank you for providing all the information. I'll now generate your case report.",
    arabic: "شكراً لك على تقديم جميع المعلومات. سأقوم الآن بإنشاء تقرير قضيتك."
};

const missingMessages = (fields, language = 'english') => ({
    english: `I notice we're missing some information: ${fields.join(', ')}. Would you like to provide these details, or shall we proceed with what we have?`,
    arabic: `ألاحظ أننا نفتقد بعض المعلومات: ${fields.join(', ')}. هل تريد تقديم هذه التفاصيل، أم نتابع بما لدينا؟`
}[language] || this.english);

function createSystemPrompt(caseType, language = 'english') {
    return `
You are a helpful legal assistant in Qatar, helping users build their case files.

You are currently collecting information for a ${caseType.replace('_', ' ')} case.

Your role:
1. Ask questions from the structured flow in a natural, conversational way
2. Be empathetic and understanding
3. Help users feel comfortable sharing their information
4. Guide them through the process step by step
5. If users can't provide information or want to skip questions, that's perfectly fine
6. Don't pressure users - just move to the next question if they can't answer
7. Use conversation context to make responses feel natural and connected
8. Avoid generic phrases like "Hey there!" or "I'm here to help"

Remember:
- ${languageInstructions[language] || 'Always respond in English'}
- Be patient and supportive
- If users seem confused, offer clarification
- If they want to skip a question, that's okay - just acknowledge and move on
- Don't repeat the same question if they can't answer it
- Make each response feel like a natural continuation of the conversation
`;
}

function extractionPrompt({ question, field, userMessage, type }) {
    if (type === 'date') {
        return `
You are helping to extract specific information from a user's response.

Current question being asked: "${question}"
Field being collected: "${field}"

User's response: "${userMessage}"

Extract the relevant information and return it as a simple value. 
If the user's response is a relative date (like 'yesterday' or 'last Friday'), convert it to an absolute date in YYYY-MM-DD format (e.g., 2024-06-01). If the user didn't provide the information or said they don't know/remember, return "SKIPPED".

Examples:
- Question: "When did the accident occur?" 
- User: "It happened last Friday around 3 PM"
- Extract: "2024-01-19"

- Question: "When did the accident occur?"
- User: "Yesterday"
- Extract: "2024-06-01"

- Question: "What is the make of your vehicle?"
- User: "I don't remember"
- Extract: "SKIPPED"

Extract only the information, no explanations:
`;
    }
    return `
You are helping to extract specific information from a user's response.

Current question being asked: "${question}"
Field being collected: "${field}"

User's response: "${userMessage}"

Extract the relevant information and return it as a simple value. 
If the user didn't provide the information or said they don't know/remember, return "SKIPPED".

Examples:
- Question: "When did the accident occur?" 
- User: "It happened last Friday around 3 PM"
- Extract: "2024-01-19 15:00"

- Question: "What is the make of your vehicle?"
- User: "I don't remember"
- Extract: "SKIPPED"

- Question: "What is your phone number?"
- User: "I'll tell you later"
- Extract: "SKIPPED"

Extract only the information, no explanations:
`;
}

function generateOpeningMessage(caseType, firstQuestion) {
    if (caseType === 'cat_case') {
        return `I'll help you solve your cat mystery: ${firstQuestion.question}`;
    }
    return firstQuestion.question;
}

const skipPhrases = [
    "i don't remember", "don't remember", "i don't know", "don't know", "idk",
    "i forgot", "forgot", "not sure", "unsure", "can't remember",
    "skip", "pass", "later", "maybe later", "i'll tell you later",
    "no idea", "no clue", "not available", "unavailable",
    "i don't have", "don't have", "missing", "lost"
];

module.exports = {
    languageInstructions,
    skipPrefixes,
    summaryMessages,
    missingMessages,
    createSystemPrompt,
    extractionPrompt,
    generateOpeningMessage,
    skipPhrases
}; 