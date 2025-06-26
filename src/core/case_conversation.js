/**
 * Case conversation manager
 * Handles the conversation flow for specific case types
 */

const { v4: uuidv4 } = require('uuid');
const { CASE_STRUCTURES, CASE_TYPES } = require('./case_structure');
const { getFanarChatCompletion } = require('./fanar_service');
const { 
    generateEmpatheticPrompt, 
    generateInterpretativePrompt, 
    generateCaseSummaryPrompt 
} = require('../prompts/conversation_prompts');

// Conversation modes
const CONVERSATION_MODES = {
    EMPATHETIC: 'empathetic',
    RULE_BASED: 'rule_based',
    INTERPRETATIVE: 'interpretative'
};

class CaseConversationManager {
    constructor() {
        this.currentCase = null;
        this.language = 'english';
    }
    
    /**
     * Start a new case conversation
     * @param {string} caseType - The type of case to start
     * @returns {Object} Initial response for the conversation
     */
    async startCase(caseType) {
        if (!Object.values(CASE_TYPES).includes(caseType)) {
            throw new Error(`Invalid case type: ${caseType}`);
        }
        
        const caseStructure = CASE_STRUCTURES[caseType];
        
        this.currentCase = {
            id: Date.now().toString(),
            caseType: caseType,
            structure: caseStructure,
            currentQuestionIndex: -1,
            answers: {},
            complete: false,
            mode: CONVERSATION_MODES.EMPATHETIC,
            conversationHistory: []
        };
        
        // Generate welcome message using Fanar
        const welcomePrompt = generateEmpatheticPrompt(
            `I've been a victim of a ${caseStructure.title.toLowerCase()}. Can you help me?`
        );
        
        const welcomeMessage = await getFanarChatCompletion(welcomePrompt);
        
        // Store in conversation history
        this.currentCase.conversationHistory.push(
            { role: 'user', content: `I've been a victim of a ${caseStructure.title.toLowerCase()}. Can you help me?` },
            { role: 'assistant', content: welcomeMessage }
        );
        
        return {
            message: welcomeMessage,
            options: []
        };
    }
    
    /**
     * Process user response in the conversation
     * @param {string} userResponse - The user's response to the current question
     * @returns {Object} Next response in the conversation
     */
    async processUserResponse(userResponse) {
        if (!this.currentCase) {
            throw new Error('No active case. Please start a case first.');
        }
        
        // Add user message to history
        this.currentCase.conversationHistory.push({ role: 'user', content: userResponse });
        
        let response;
        
        // Handle response based on the current mode
        switch (this.currentCase.mode) {
            case CONVERSATION_MODES.EMPATHETIC:
                response = await this.handleEmpatheticMode(userResponse);
                break;
                
            case CONVERSATION_MODES.RULE_BASED:
                response = await this.handleRuleBasedMode(userResponse);
                break;
                
            case CONVERSATION_MODES.INTERPRETATIVE:
                response = await this.handleInterpretativeMode(userResponse);
                break;
                
            default:
                throw new Error(`Unknown conversation mode: ${this.currentCase.mode}`);
        }
        
        // Add assistant response to history
        this.currentCase.conversationHistory.push({ role: 'assistant', content: response.message });
        
        return response;
    }
    
    /**
     * Handle the empathetic conversation mode
     * @param {string} userResponse - The user's message
     * @returns {Object} Response object
     */
    async handleEmpatheticMode(userResponse) {
        // Check if the user wants to start the case report
        const startReportIndicators = [
            'start', 'report', 'case', 'begin', 'proceed', 'yes', 'legal', 'help me', 'continue'
        ];
        
        const shouldStartReport = startReportIndicators.some(indicator => 
            userResponse.toLowerCase().includes(indicator)
        );
        
        if (shouldStartReport) {
            // Switch to rule-based mode
            this.currentCase.mode = CONVERSATION_MODES.RULE_BASED;
            return this.advanceToNextQuestion();
        }
        
        // Continue empathetic conversation
        const prompt = [
            ...generateEmpatheticPrompt(''),
            ...this.currentCase.conversationHistory.slice(-4) // Include last 4 messages for context
        ];
        
        // Replace the last system message
        prompt[0] = {
            role: 'system',
            content: `You are Fanar, an empathetic legal assistant specializing in Qatar law. 
The user is dealing with a ${this.currentCase.structure.title.toLowerCase()}.
Be compassionate and understanding. Ask if they want to start a formal case report when appropriate.
Today's date is ${new Date().toLocaleDateString()}.`
        };
        
        const botResponse = await getFanarChatCompletion(prompt);
        
        return {
            message: botResponse,
            options: []
        };
    }
    
    /**
     * Handle the rule-based conversation mode
     * @param {string} userResponse - The user's response to the current question
     * @returns {Object} Next question or response
     */
    async handleRuleBasedMode(userResponse) {
        // If this is the first question, advance to it
        if (this.currentCase.currentQuestionIndex === -1) {
            return this.advanceToNextQuestion();
        }
        
        const currentQuestion = this.getCurrentQuestion();
        
        // Store the user's answer
        this.currentCase.answers[currentQuestion.id] = userResponse;
        
        // Check if we have more questions
        if (this.currentCase.currentQuestionIndex < this.currentCase.structure.questions.length - 1) {
            return this.advanceToNextQuestion();
        } else {
            // Switch to interpretative mode
            this.currentCase.mode = CONVERSATION_MODES.INTERPRETATIVE;
            return this.generateLegalAnalysis();
        }
    }
    
    /**
     * Handle the interpretative conversation mode
     * @param {string} userResponse - The user's message
     * @returns {Object} Response object
     */
    async handleInterpretativeMode(userResponse) {
        // Generate a formal case report
        const prompt = generateCaseSummaryPrompt(this.currentCase.answers, '');
        
        const report = await getFanarChatCompletion(prompt);
        
        // Mark case as complete
        this.currentCase.complete = true;
        
        return {
            message: report,
            options: [
                "Download report",
                "Connect with a lawyer",
                "Report to authorities"
            ],
            isComplete: true,
            caseData: this.currentCase.answers
        };
    }
    
    /**
     * Generate legal analysis based on case data
     * @returns {Object} Legal analysis response
     */
    async generateLegalAnalysis() {
        const prompt = generateInterpretativePrompt(this.currentCase.answers);
        
        const legalAnalysis = await getFanarChatCompletion(prompt);
        
        return {
            message: `Thank you for providing all the necessary information. Based on what you've told me, here's my legal analysis:\n\n${legalAnalysis}\n\nWould you like me to generate a formal report that you can use for legal proceedings?`,
            options: ["Yes, generate a report", "No, I just needed the advice"]
        };
    }
    
    /**
     * Get the current question
     * @returns {Object} The current question object
     */
    getCurrentQuestion() {
        if (!this.currentCase || this.currentCase.currentQuestionIndex === -1) {
            throw new Error('No current question.');
        }
        
        return this.currentCase.structure.questions[this.currentCase.currentQuestionIndex];
    }
    
    /**
     * Advance to the next question in the flow
     * @returns {Object} Next question response
     */
    async advanceToNextQuestion() {
        this.currentCase.currentQuestionIndex++;
        
        // Check if we've reached the end of questions
        if (this.currentCase.currentQuestionIndex >= this.currentCase.structure.questions.length) {
            // Switch to interpretative mode
            this.currentCase.mode = CONVERSATION_MODES.INTERPRETATIVE;
            return this.generateLegalAnalysis();
        }
        
        const question = this.getCurrentQuestion();
        
        // Check if this question is conditional and should be skipped
        if (question.conditionalOn) {
            const conditionQuestion = question.conditionalOn.questionId;
            const conditionValue = question.conditionalOn.value;
            
            if (this.currentCase.answers[conditionQuestion] !== conditionValue) {
                // Skip this question
                return this.advanceToNextQuestion();
            }
        }
        
        // Format options if applicable
        const options = question.options ? question.options : [];
        
        return {
            message: question.question,
            options: options
        };
    }
}

module.exports = CaseConversationManager;
