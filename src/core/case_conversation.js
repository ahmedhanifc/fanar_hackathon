const { getFanarChatCompletion } = require('./fanar_service.js');
const { getNextQuestion, validateCase, CASE_TYPES } = require('./case_structure.js');
const chrono = require('chrono-node');
const {
    languageInstructions,
    skipPrefixes,
    summaryMessages,
    missingMessages,
    createSystemPrompt,
    extractionPrompt,
    generateOpeningMessage,
    skipPhrases
} = require('../prompts/conversation_prompts.js');

class CaseConversationManager {
    constructor() {
        this.currentCase = null;
        this.conversationHistory = [];
        this.skippedFields = new Set(); // Track skipped fields
        this.conversationContext = []; // Store conversation context
        this.language = 'english'; // Default language, can be set externally
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
        const openingMessage = generateOpeningMessage(caseType, firstQuestion);
        
        this.conversationHistory = [
            { role: 'system', content: createSystemPrompt(caseType, this.language) }
        ];

        return {
            message: openingMessage,
            options: firstQuestion.options || null,
            caseId: this.currentCase.id
        };
    }

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
                const msg = missingMessages(actualMissingFields, this.language);
                this.conversationHistory.push({ role: 'assistant', content: msg });
                return {
                    message: msg,
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
        
        // Use extractionPrompt from config
        const fieldConfig = this.getFieldConfig(currentQuestion.field);
        const prompt = extractionPrompt({
            question: currentQuestion.question,
            field: currentQuestion.field,
            userMessage,
            type: fieldConfig?.type
        });

        try {
            const response = await getFanarChatCompletion([
                { role: 'system', content: prompt },
                { role: 'user', content: userMessage }
            ]);

            // Clean up the response (remove quotes, extra text)
            let cleaned = response.trim().replace(/^['"]|['"]$/g, '');
            
            // If LLM says SKIPPED or user clearly can't provide info, mark as skipped
            if (cleaned === 'SKIPPED' || this.checkForSkipResponse(userMessage).shouldSkip) {
                return 'SKIPPED';
            }

            // Backend fallback: if expecting a date and the LLM did not return a valid date, try chrono-node
            if (fieldConfig?.type === 'date') {
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

    // Generate the next question using config for natural language
    async generateNextQuestion(questionData, afterSkip = false) {
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
            return missingMessages(actualMissingFields, this.language);
        }
        return summaryMessages[this.language] || summaryMessages.english;
    }

    // Create system prompt that guides the LLM
    createSystemPrompt(caseType) {
        return createSystemPrompt(caseType, this.language);
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