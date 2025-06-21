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
    skipPhrases,
    smallTalkPrompt,
    supportivePrompt
} = require('../prompts/conversation_prompts.js');

const {
    isGreeting,
    isHelpRequest,
    isEmotionalOrStory,
    isConsent
} = require('./conversation_utils.js');

class CaseConversationManager {
    constructor() {
        this.currentCase = null;
        this.conversationHistory = [];
        this.skippedFields = new Set(); // Track skipped fields
        this.conversationContext = []; // Store conversation context
        this.language = 'english'; // Default language, can be set externally
        this.awaitingCaseDescription = false; // For conversational flow
        this.freeTalkMode = false; // New flag for free talk mode
        this.mode = 'conversation'; // New: track conversation phase
        this.awaitingChecklistConfirmation = false; // Track if waiting for checklist confirmation
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

        // Only initialize the system prompt, do not send an opening message
        this.conversationHistory = [
            { role: 'system', content: this.createSystemPrompt(caseType) }
        ];

        return {
            message: null, // No opening message
            options: null,
            caseId: this.currentCase.id
        };
    }

    // Detect if user wants to start a report (simple rule-based for now)
    isReportIntent(userMessage) {
        const reportPhrases = [
            'file a report',
            'report a case',
            'submit a report',
            'help me with a report',
            'start a report',
            'بلاغ', // Arabic for report
            'أرغب في تقديم بلاغ',
            'أريد تقديم بلاغ',
            'can you help me with a report',
            'i want to report',
            'i need to report',
            'i want to file',
            'i need to file'
        ];
        const lower = userMessage.toLowerCase();
        return reportPhrases.some(phrase => lower.includes(phrase));
    }

    async processUserResponse(userMessage) {
        // Handle awaiting checklist confirmation
        if (this.awaitingChecklistConfirmation) {
            if (this.isAffirmative(userMessage)) {
                this.mode = 'checklist';
                this.awaitingChecklistConfirmation = false;
                if (!this.currentCase) {
                    await this.startCase('default');
                }
                const transitionMsg = "Great, let's start the report checklist. I'll ask you a few questions.";
                this.conversationHistory.push({ role: 'assistant', content: transitionMsg });
                const currentQuestion = getNextQuestion(this.currentCase.caseType, this.currentCase.data);
                if (currentQuestion) {
                    const response = await this.generateNextQuestion(currentQuestion);
                    this.conversationHistory.push({ role: 'assistant', content: response });
                    return {
                        message: `${transitionMsg}\n${response}`,
                        options: currentQuestion.options || null,
                        isComplete: false
                    };
                }
            } else {
                this.awaitingChecklistConfirmation = false;
                // Continue conversation mode
                const prompt = this.createSystemPrompt('conversation');
                const llmResponse = await getFanarChatCompletion([
                    { role: 'system', content: prompt },
                    ...this.conversationHistory,
                    { role: 'user', content: userMessage }
                ]);
                this.conversationHistory.push({ role: 'assistant', content: llmResponse });
                return {
                    message: llmResponse,
                    isComplete: false
                };
            }
        }
        // MODE SWITCHING LOGIC
        if (this.mode === 'conversation') {
            this.conversationHistory.push({ role: 'user', content: userMessage });
            // Check for report intent
            if (this.isReportIntent(userMessage)) {
                // Instead of switching immediately, ask for confirmation
                this.awaitingChecklistConfirmation = true;
                const confirmMsg = "Would you like to start the report checklist now?";
                this.conversationHistory.push({ role: 'assistant', content: confirmMsg });
                return {
                    message: confirmMsg,
                    isComplete: false
                };
            } else {
                // LLM-driven conversation (empathy, small talk, etc.)
                // Add to system prompt: instruct LLM to ask for confirmation before checklist
                const prompt = this.createSystemPrompt('conversation');
                const llmResponse = await getFanarChatCompletion([
                    { role: 'system', content: prompt },
                    ...this.conversationHistory
                ]);
                this.conversationHistory.push({ role: 'assistant', content: llmResponse });
                return {
                    message: llmResponse,
                    isComplete: false
                };
            }
        }
        // TODO: Checklist mode (structured intake)
        if (this.mode === 'checklist') {
            // Add user message to history
            this.conversationHistory.push({ role: 'user', content: userMessage });

            // Get current question and field config
            const currentQuestion = getNextQuestion(this.currentCase.caseType, this.currentCase.data);
            if (!currentQuestion) {
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
                // All required fields are filled or skipped - switch to legal advice mode
                this.mode = 'legal_advice';
                // Generate legal advice using the new system prompt
                const prompt = this.createSystemPrompt('legal_advice');
                // Optionally, you can load legal sources and append them to the prompt here
                const llmAdvice = await getFanarChatCompletion([
                    { role: 'system', content: prompt },
                    { role: 'user', content: JSON.stringify(this.currentCase.data) }
                ]);
                this.conversationHistory.push({ role: 'assistant', content: llmAdvice });
                return {
                    message: llmAdvice,
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
                // All required fields are filled or skipped - switch to legal advice mode
                this.mode = 'legal_advice';
                const prompt = this.createSystemPrompt('legal_advice');
                const llmAdvice = await getFanarChatCompletion([
                    { role: 'system', content: prompt },
                    { role: 'user', content: JSON.stringify(this.currentCase.data) }
                ]);
                this.conversationHistory.push({ role: 'assistant', content: llmAdvice });
                return {
                    message: llmAdvice,
                    isComplete: true,
                    caseData: this.currentCase
                };
            }
        }
        // TODO: Legal advice and agentic action modes
        return { message: '[Unknown mode]', isComplete: false };
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
        // Add instruction: Only offer to start the checklist, do not switch modes yourself
        let basePrompt = createSystemPrompt(caseType, this.language);
        if (caseType === 'conversation' || !caseType) {
            basePrompt += '\nIf the user seems to want to file a report or start a checklist, ask them: "Would you like to start the report checklist now?". Only proceed if the user confirms.';
        }
        return basePrompt;
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

    // Helper to check for affirmative responses
    isAffirmative(msg) {
        const affirmatives = [
            'yes', 'start checklist', 'sure', 'okay', 'yep', 'let\'s start', 'go ahead', 'please do', 'begin', 'start', 'of course', 'affirmative', 'do it', 'continue', 'proceed', 'تمام', 'نعم', 'أجل', 'ابدأ', 'يلا', 'اوكي', 'موافق', 'أوافق', 'أيوه', 'ايوا', 'طيب', 'باشر', 'اكمل', 'أكمل', 'تابع', 'استمر'
        ];
        const lowerMsg = msg.toLowerCase();
        return affirmatives.some(a => lowerMsg.includes(a));
    }
}

module.exports = { CaseConversationManager }; 