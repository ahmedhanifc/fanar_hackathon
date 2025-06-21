const { getFanarChatCompletion } = require('./fanar_service.js');
const { getNextQuestion, validateCase, CASE_TYPES } = require('./case_structure.js');
const chrono = require('chrono-node');

class CaseConversationManager {
    constructor(language = 'english') {
        this.currentCase = null;
        this.conversationHistory = [];
        this.skippedFields = new Set(); // Track skipped fields
        this.conversationContext = []; // Store conversation context
        this.language = language; // 'english' or 'arabic'
    }

    // Start a new case conversation
    async startCase(caseType) {
        this.currentCase = {
            id: Date.now().toString(), // Add unique ID
            caseType: caseType,
            data: {},
            status: 'in_progress',
            createdAt: new Date(),
            updatedAt: new Date()
        };

        // Get the first question from our structure
        const firstQuestion = getNextQuestion(caseType, this.currentCase.data);
        
        if (!firstQuestion) {
            throw new Error('No questions found for case type: ' + caseType);
        }
        
        // Create a more natural opening message
        const openingMessage = await this.generateOpeningMessage(caseType, firstQuestion);
        
        this.conversationHistory = [
            { role: 'system', content: this.createSystemPrompt(caseType) }
        ];

        return {
            message: openingMessage,
            options: firstQuestion.options || null,
            caseId: this.currentCase.id
        };
    }

    // Generate a natural opening message
    async generateOpeningMessage(caseType, firstQuestion) {
        const caseTypeName = caseType.replace('_', ' ');
        
        // Language-specific opening messages
        const openingMessages = {
            'traffic_accident': {
                english: `I'll help you document your traffic accident. ${firstQuestion.question}`,
                arabic: `سأساعدك في توثيق حادثك المروري. ${firstQuestion.question}`
            },
            'consumer_complaint': {
                english: `I'll help you file a consumer complaint. ${firstQuestion.question}`,
                arabic: `سأساعدك في تقديم شكوى المستهلك. ${firstQuestion.question}`
            }
        };
        
        return openingMessages[caseType]?.[this.language] || firstQuestion.question;
    }

    // Process user response and get next question
    async processUserResponse(userMessage) {
        // Add user message to history
        this.conversationHistory.push({ role: 'user', content: userMessage });

        // Get current question and field config
        const currentQuestion = getNextQuestion(this.currentCase.caseType, this.currentCase.data);
        if (!currentQuestion) {
            // No more questions, return a graceful message or summary
            const summary = await this.generateCaseSummary();
            this.conversationHistory.push({ role: 'assistant', content: summary });
            return {
                message: summary,
                isComplete: true,
                caseData: this.currentCase
            };
        }
        // Check if user wants to skip or can't provide information
        const skipResponse = this.checkForSkipResponse(userMessage);
        if (skipResponse.shouldSkip) {
            if (currentQuestion && currentQuestion.allowSkip === false) {
                // Re-ask, do not skip
                const clarification = `Sorry, I need this information to proceed. ${currentQuestion.question}`;
                this.conversationHistory.push({ role: 'assistant', content: clarification });
                return {
                    message: clarification,
                    options: currentQuestion.options || null,
                    isComplete: false
                };
            }
            // Mark current field as skipped and move to next
            if (currentQuestion) {
                this.skippedFields.add(currentQuestion.field);
                this.currentCase.data[currentQuestion.field] = 'SKIPPED';
            }
            // Get next question
            const nextQuestion = getNextQuestion(this.currentCase.caseType, this.currentCase.data);
            if (nextQuestion) {
                const response = await this.generateNextQuestion(nextQuestion, true); // true = after skip
                this.conversationHistory.push({ role: 'assistant', content: response });
                return {
                    message: response,
                    options: nextQuestion.options || null,
                    isComplete: false
                };
            }
        }

        // Extract information from user's response using LLM
        const extractedInfo = await this.extractInformation(userMessage);
        // Get current question and field config
        const fieldConfig = currentQuestion ? this.getFieldConfig(currentQuestion.field) : null;
        // Validate extracted info
        if (!this.validateExtractedInfo(extractedInfo, fieldConfig)) {
            // If invalid, re-ask the question with clarification
            const clarification = `Sorry, I need a valid answer for this field. ${currentQuestion.question}`;
            this.conversationHistory.push({ role: 'assistant', content: clarification });
            return {
                message: clarification,
                options: currentQuestion.options || null,
                isComplete: false
            };
        }
        // Update case data with extracted information
        this.updateCaseData(extractedInfo);
        // Get next question from structure
        const nextQuestion = getNextQuestion(this.currentCase.caseType, this.currentCase.data);
        if (nextQuestion) {
            // Still have questions to ask
            const response = await this.generateNextQuestion(nextQuestion);
            this.conversationHistory.push({ role: 'assistant', content: response });
            return {
                message: response,
                options: nextQuestion.options || null,
                isComplete: false
            };
        } else {
            // All questions answered - check for missing required fields
            const validation = validateCase(this.currentCase.caseType, this.currentCase.data);
            // Filter out skipped fields from missing fields
            const actualMissingFields = validation.missingFields.filter(field => 
                !this.skippedFields.has(field)
            );
            if (actualMissingFields.length > 0) {
                const missingMessages = {
                    english: `I notice we're missing some information: ${actualMissingFields.join(', ')}. Would you like to provide these details, or shall we proceed with what we have?`,
                    arabic: `ألاحظ أننا نفتقد بعض المعلومات: ${actualMissingFields.join(', ')}. هل تريد تقديم هذه التفاصيل، أم نتابع بما لدينا؟`
                };
                this.conversationHistory.push({ role: 'assistant', content: missingMessages[this.language] || missingMessages.english });
                return {
                    message: missingMessages[this.language] || missingMessages.english,
                    isComplete: false,
                    caseData: this.currentCase
                };
            }
            // All required fields are filled or skipped - generate summary
            const summary = await this.generateCaseSummary();
            this.conversationHistory.push({ role: 'assistant', content: summary });
            return {
                message: summary,
                isComplete: true,
                caseData: this.currentCase
            };
        }
    }

    // Check if user response indicates they want to skip or can't provide info
    checkForSkipResponse(userMessage) {
        const skipPhrases = [
            'i don\'t remember', 'don\'t remember', 'i don\'t know', 'don\'t know', 'idk',
            'i forgot', 'forgot', 'not sure', 'unsure', 'can\'t remember',
            'skip', 'pass', 'later', 'maybe later', 'i\'ll tell you later',
            'no idea', 'no clue', 'not available', 'unavailable',
            'i don\'t have', 'don\'t have', 'missing', 'lost'
        ];

        const lowerMessage = userMessage.toLowerCase();
        const shouldSkip = skipPhrases.some(phrase => lowerMessage.includes(phrase));

        return {
            shouldSkip,
            reason: shouldSkip ? 'User cannot provide or wants to skip this information' : null
        };
    }

    // Use LLM to extract structured information from user's response
    async extractInformation(userMessage) {
        const currentQuestion = getNextQuestion(this.currentCase.caseType, this.currentCase.data);
        
        if (!currentQuestion) {
            console.error('No current question found');
            return 'SKIPPED';
        }
        
        // If the field is a date, instruct the LLM to return an absolute date
        let extractionPrompt;
        if (this.getFieldConfig(currentQuestion.field)?.type === 'date') {
            extractionPrompt = `
You are helping to extract specific information from a user's response.

Current question being asked: "${currentQuestion.question}"
Field being collected: "${currentQuestion.field}"

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
        } else {
            extractionPrompt = `
You are helping to extract specific information from a user's response.

Current question being asked: "${currentQuestion.question}"
Field being collected: "${currentQuestion.field}"

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

        try {
            const response = await getFanarChatCompletion([
                { role: 'system', content: extractionPrompt },
                { role: 'user', content: userMessage }
            ]);

            // Clean up the response (remove quotes, extra text)
            let cleaned = response.trim().replace(/^["']|["']$/g, '');
            
            // If LLM says SKIPPED or user clearly can't provide info, mark as skipped
            if (cleaned === 'SKIPPED' || this.checkForSkipResponse(userMessage).shouldSkip) {
                return 'SKIPPED';
            }

            // Backend fallback: if expecting a date and the LLM did not return a valid date, try chrono-node
            if (this.getFieldConfig(currentQuestion.field)?.type === 'date') {
                if (isNaN(Date.parse(cleaned))) {
                    const chronoResult = chrono.parseDate(cleaned, new Date(), { forwardDate: true });
                    if (chronoResult) {
                        // Format as YYYY-MM-DD
                        const yyyy = chronoResult.getFullYear();
                        const mm = String(chronoResult.getMonth() + 1).padStart(2, '0');
                        const dd = String(chronoResult.getDate()).padStart(2, '0');
                        return `${yyyy}-${mm}-${dd}`;
                    }
                }
            }
            
            return cleaned;
        } catch (error) {
            console.error('Error extracting information:', error);
            return 'SKIPPED'; // Better fallback than raw message
        }
    }

    // Update case data with extracted information
    updateCaseData(extractedInfo) {
        const currentQuestion = getNextQuestion(this.currentCase.caseType, this.currentCase.data);
        
        if (currentQuestion && extractedInfo && extractedInfo !== 'null') {
            const fieldPath = currentQuestion.field.split('.');
            let current = this.currentCase.data;
            
            // Navigate to the parent object
            for (let i = 0; i < fieldPath.length - 1; i++) {
                if (!current[fieldPath[i]]) {
                    current[fieldPath[i]] = {};
                }
                current = current[fieldPath[i]];
            }
            
            // Set the value
            current[fieldPath[fieldPath.length - 1]] = extractedInfo;
            this.currentCase.updatedAt = new Date();
        }
    }

    // Generate the next question using LLM for natural language
    async generateNextQuestion(questionData, afterSkip = false) {
        // Language-specific prefixes
        const skipPrefixes = {
            english: 'No problem, let\'s continue. ',
            arabic: 'لا بأس، دعنا نتابع. '
        };
        
        let prefix = '';
        
        if (afterSkip) {
            prefix = skipPrefixes[this.language] || '';
        }
        
        return `${prefix}${questionData.question}`;
    }

    // Generate case summary when complete
    async generateCaseSummary() {
        const validation = validateCase(this.currentCase.caseType, this.currentCase.data);
        
        // Filter out skipped fields from missing fields
        const actualMissingFields = validation.missingFields.filter(field => 
            !this.skippedFields.has(field)
        );
        
        if (actualMissingFields.length > 0) {
            const missingMessages = {
                english: `I notice we're missing some information: ${actualMissingFields.join(', ')}. Would you like to provide these details, or shall we proceed with what we have?`,
                arabic: `ألاحظ أننا نفتقد بعض المعلومات: ${actualMissingFields.join(', ')}. هل تريد تقديم هذه التفاصيل، أم نتابع بما لدينا؟`
            };
            return missingMessages[this.language] || missingMessages.english;
        }

        const summaryMessages = {
            english: "Thank you for providing all the information. I'll now generate your case report.",
            arabic: "شكراً لك على تقديم جميع المعلومات. سأقوم الآن بإنشاء تقرير قضيتك."
        };

        return summaryMessages[this.language] || summaryMessages.english;
    }

    // Create system prompt that guides the LLM
    createSystemPrompt(caseType) {
        const languageInstructions = {
            english: 'Always respond in English',
            arabic: 'Always respond in Arabic'
        };
        
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
- ${languageInstructions[this.language] || 'Always respond in English'}
- Be patient and supportive
- If users seem confused, offer clarification
- If they want to skip a question, that's okay - just acknowledge and move on
- Don't repeat the same question if they can't answer it
- Make each response feel like a natural continuation of the conversation
`;
    }

    // Helper to get field config from structure
    getFieldConfig(fieldPathStr) {
        const { getCaseStructure } = require('./case_structure.js');
        const structure = getCaseStructure(this.currentCase.caseType);
        const fieldPath = fieldPathStr.split('.');
        let config = structure.fields;
        for (let i = 0; i < fieldPath.length; i++) {
            config = config[fieldPath[i]];
            if (!config) break;
        }
        return config;
    }

    // Helper to validate extracted info against field config
    validateExtractedInfo(extractedInfo, fieldConfig) {
        if (!fieldConfig) return false;
        if (extractedInfo === 'SKIPPED') return true;
        
        switch (fieldConfig.type) {
            case 'string':
            case 'text':
                return typeof extractedInfo === 'string' && extractedInfo.trim().length > 1;
            case 'number':
                return !isNaN(Number(extractedInfo)) && Number(extractedInfo) > 0;
            case 'date':
                return !isNaN(Date.parse(extractedInfo));
            case 'boolean':
                return (
                    typeof extractedInfo === 'boolean' ||
                    ['yes','no','true','false','y','n','1','0'].includes(extractedInfo.toString().toLowerCase())
                );
            case 'enum':
                if (!fieldConfig.options) return false;
                const userInput = extractedInfo.toLowerCase();
                return fieldConfig.options.some(opt => {
                    const optionText = opt.toLowerCase().replace(/_/g, ' ');
                    return userInput.includes(optionText) || optionText.includes(userInput);
                });
            case 'array':
                return Array.isArray(extractedInfo) || (typeof extractedInfo === 'string' && extractedInfo.split(',').length > 1);
            default:
                return !!extractedInfo;
        }
    }
}

module.exports = { CaseConversationManager }; 