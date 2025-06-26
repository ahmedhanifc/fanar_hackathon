const { getCaseStructure, getNextQuestion, validateCase, CASE_TYPES } = require('./case_structure');
const { 
    isGreeting, 
    isHelpRequest, 
    isEmotionalOrStory, 
    isConsent, 
    detectOptionSelection,
    wantsToSkip,
    isNegativeResponse,
    isPositiveResponse,
    containsCaseKeywords,
    isBriefDescription
} = require('./conversation_utils');
const { createSystemPrompt, extractionPrompt } = require('../prompts/conversation_prompts');
const { getFanarChatCompletion } = require('./fanar_service');

class CaseConversationManager {
    constructor() {
        this.conversationState = {
            mode: 'conversation', // 'conversation', 'information_gathering', 'legal_advice', 'agentic_action'
            caseType: null,
            caseData: {},
            currentQuestionIndex: 0,
            language: 'english',
            conversationHistory: []
        };
        
        // Add properties expected by chat routes
        this.currentCase = {
            id: null,
            caseType: null,
            status: 'active'
        };
        
        this.language = 'english';
    }

    // Method expected by chat routes to start a case
    async startCase(caseType) {
        this.currentCase.id = Date.now().toString();
        this.currentCase.caseType = caseType;
        this.conversationState.caseType = caseType;
        
        return {
            message: "Hello! I'm here to help you with your legal situation. Could you tell me what happened?",
            options: null,
            caseType: caseType
        };
    }

    // Method expected by chat routes to process user response
    async processUserResponse(message) {
        const response = await this.processUserInput(message, this.getLLMService());
        
        // Check if conversation is complete
        const isComplete = this.conversationState.mode === 'legal_advice' && 
                          (response.includes('Here are your options') || 
                           response.includes('Please choose an option'));
        
        return {
            message: response,
            options: isComplete ? ['1', '2', '3', '4'] : null,
            isComplete: isComplete,
            caseData: this.conversationState.caseData,
            caseType: this.currentCase.caseType
        };
    }

    // Main method to process user input and generate response
    async processUserInput(userMessage, llmService) {
        const message = userMessage.trim();
        
        // Add to conversation history
        this.conversationState.conversationHistory.push({
            role: 'user',
            content: message,
            timestamp: new Date()
        });

        let response;
        
        switch (this.conversationState.mode) {
            case 'conversation':
                response = await this.handleConversationalMode(message, llmService);
                break;
            case 'information_gathering':
                response = await this.handleInformationGatheringMode(message, llmService);
                break;
            case 'legal_advice':
                response = await this.handleLegalAdviceMode(message, llmService);
                break;
            case 'agentic_action':
                response = await this.handleAgenticActionMode(message, llmService);
                break;
            default:
                response = "I'm here to help. Could you tell me what happened?";
        }

        // Add response to conversation history
        this.conversationState.conversationHistory.push({
            role: 'assistant',
            content: response,
            timestamp: new Date()
        });

        return response;
    }

    // Mode 1: Natural Conversational Mode - Let LLM handle natural flow
    async handleConversationalMode(message, llmService) {
        // Check if user explicitly asks for report help
        const wantsReportHelp = message.toLowerCase().includes('report') && 
                               (message.toLowerCase().includes('help') || 
                                message.toLowerCase().includes('need') || 
                                message.toLowerCase().includes('want') ||
                                message.toLowerCase().includes('create') ||
                                message.toLowerCase().includes('file'));
        
        if (wantsReportHelp) {
            // Transition to information gathering mode
            this.conversationState.mode = 'information_gathering';
            this.conversationState.caseType = this.currentCase.caseType || CASE_TYPES.PHISHING_SMS_CASE;
            
            const structure = getCaseStructure(this.conversationState.caseType);
            const firstQuestion = structure.questions[0];
            
            return `I understand you'd like help creating a formal legal report. This will help you document your case properly and can be used for legal proceedings. Let me gather some information to create a comprehensive report for you.

${firstQuestion.question}`;
        }

        // Let the LLM handle natural conversation
        const systemPrompt = createSystemPrompt('conversation', '', this.conversationState.language);
        
        const llmResponse = await llmService.generateResponse({
            systemPrompt,
            userMessage: message,
            conversationHistory: this.conversationState.conversationHistory.slice(-6) // Last 6 messages for context
        });

        return llmResponse;
    }

    // Mode 2: Information Gathering Mode - Sequential checklist
    async handleInformationGatheringMode(message, llmService) {
        const structure = getCaseStructure(this.conversationState.caseType);
        const currentQuestion = structure.questions[this.conversationState.currentQuestionIndex];
        
        if (!currentQuestion) {
            // All questions answered, transition to legal advice mode
            this.conversationState.mode = 'legal_advice';
            return this.generateLegalAdviceOptions();
        }

        // Check if user wants to skip this question
        if (wantsToSkip(message) && currentQuestion.allowSkip) {
            this.conversationState.currentQuestionIndex++;
            const nextQuestion = structure.questions[this.conversationState.currentQuestionIndex];
            
            if (nextQuestion) {
                return `No problem, let's continue. ${nextQuestion.question}`;
            } else {
                this.conversationState.mode = 'legal_advice';
                return this.generateLegalAdviceOptions();
            }
        }

        // Extract information from user's response
        const extractedInfo = await this.extractInformation(message, currentQuestion, llmService);
        
        // Store the extracted information
        if (extractedInfo !== 'SKIPPED') {
            this.conversationState.caseData[currentQuestion.field] = extractedInfo;
        }

        // Move to next question
        this.conversationState.currentQuestionIndex++;
        const nextQuestion = structure.questions[this.conversationState.currentQuestionIndex];

        if (nextQuestion) {
            return `${currentQuestion.allowSkip ? "Thank you. " : ""}${nextQuestion.question}`;
        } else {
            // All questions answered, transition to legal advice mode
            this.conversationState.mode = 'legal_advice';
            return this.generateLegalAdviceOptions();
        }
    }

    // Mode 3: Legal Advice Mode - Provide action steps and cite sources
    async handleLegalAdviceMode(message, llmService) {
        const selectedOption = detectOptionSelection(message);
        
        if (selectedOption === '1' || message.toLowerCase().includes('guidance') || message.toLowerCase().includes('advice')) {
            return await this.generateLegalGuidance(llmService);
        } else if (selectedOption === '2' || message.toLowerCase().includes('report')) {
            return await this.generateStructuredReport(llmService);
        } else if (selectedOption === '3' || message.toLowerCase().includes('contact') || message.toLowerCase().includes('law firm')) {
            this.conversationState.mode = 'agentic_action';
            return "I can help you contact a law firm on your behalf. Would you like me to draft a professional email to a law firm with your case details and attach the legal report? (yes/no)";
        } else if (selectedOption === '4' || isNegativeResponse(message)) {
            return await this.generateStructuredReport(llmService);
        } else {
            return this.generateLegalAdviceOptions();
        }
    }

    // Mode 4: Agentic Action Mode - Craft emails to law firms
    async handleAgenticActionMode(message, llmService) {
        if (isPositiveResponse(message)) {
            return await this.draftLawFirmEmail(llmService);
        } else {
            return await this.generateStructuredReport(llmService);
        }
    }

    // Helper methods
    async extractInformation(message, question, llmService) {
        const prompt = extractionPrompt({
            question: question.question,
            field: question.field,
            userMessage: message,
            type: 'text'
        });

        const response = await llmService.generateResponse({
            systemPrompt: prompt,
            userMessage: message
        });

        return response.trim();
    }

    generateLegalAdviceOptions() {
        return `Thank you for providing all the information. I've documented your case and can now help you with next steps. Here are your options:

1. **Legal Guidance**: I can provide you with specific legal advice on how to proceed, including relevant Qatari laws and authorities to contact.

2. **Structured Report**: I can generate a formal legal report with all your case details that you can use for legal proceedings.

3. **Contact Law Firm**: I can help you contact a law firm on your behalf with your case details and the legal report.

4. **Just the Report**: If you prefer, I can simply generate the report without additional guidance.

Please choose an option (1, 2, 3, or 4):`;
    }

    async generateLegalGuidance(llmService) {
        const systemPrompt = createSystemPrompt('legal_advice', this.conversationState.caseType, this.conversationState.language);
        
        const caseSummary = this.generateCaseSummary();
        
        const response = await llmService.generateResponse({
            systemPrompt,
            userMessage: `Please provide legal guidance for this case: ${caseSummary}`
        });

        return response;
    }

    async generateStructuredReport(llmService) {
        const caseSummary = this.generateCaseSummary();
        const validation = validateCase(this.conversationState.caseType, this.conversationState.caseData);
        
        let report = `# Legal Case Report\n\n`;
        report += `**Case Type**: ${this.conversationState.caseType.replace('_', ' ')}\n`;
        report += `**Date Generated**: ${new Date().toISOString().split('T')[0]}\n\n`;
        
        // Add case data
        for (const [field, value] of Object.entries(this.conversationState.caseData)) {
            if (value && value !== 'SKIPPED') {
                report += `**${field.replace(/([A-Z])/g, ' $1').trim()}**: ${value}\n`;
            }
        }
        
        if (!validation.isValid) {
            report += `\n**Note**: Missing required information: ${validation.missingFields.join(', ')}\n`;
        }
        
        return report;
    }

    async draftLawFirmEmail(llmService) {
        const systemPrompt = createSystemPrompt('agentic_action', '', this.conversationState.language);
        const caseSummary = this.generateCaseSummary();
        
        const response = await llmService.generateResponse({
            systemPrompt,
            userMessage: `Please draft a professional email to a law firm for this case: ${caseSummary}`
        });

        return response;
    }

    generateCaseSummary() {
        const data = this.conversationState.caseData;
        let summary = '';
        
        for (const [field, value] of Object.entries(data)) {
            if (value && value !== 'SKIPPED') {
                summary += `${field}: ${value}. `;
            }
        }
        
        return summary;
    }

    // LLM service using Fanar API
    getLLMService() {
        return {
            generateResponse: async ({ systemPrompt, userMessage, conversationHistory = [] }) => {
                try {
                    // Build messages array for Fanar API
                    const messages = [
                        { role: 'system', content: systemPrompt }
                    ];
                    
                    // Add conversation history if provided
                    if (conversationHistory.length > 0) {
                        messages.push(...conversationHistory.slice(-6)); // Last 6 messages for context
                    }
                    
                    // Add current user message
                    messages.push({ role: 'user', content: userMessage });
                    
                    // Call Fanar API
                    const response = await getFanarChatCompletion(messages);
                    return response;
                    
                } catch (error) {
                    console.error('Error calling Fanar API:', error);
                    // Fallback response
                    if (this.conversationState.mode === 'conversation') {
                        return "I understand how stressful this must be for you. Could you tell me more about what happened? I can help you create a formal legal report and provide legal guidance. Would you like to start the report process?";
                    }
                    return "Thank you for that information. Let me help you with the next steps.";
                }
            }
        };
    }

    // Reset conversation state
    reset() {
        this.conversationState = {
            mode: 'conversation',
            caseType: null,
            caseData: {},
            currentQuestionIndex: 0,
            language: 'english',
            conversationHistory: []
        };
        
        this.currentCase = {
            id: null,
            caseType: null,
            status: 'active'
        };
    }

    // Get current state for debugging
    getState() {
        return { ...this.conversationState };
    }
}

module.exports = CaseConversationManager;
