

const { CASE_STRUCTURES, CASE_TYPES } = require('./case_structure');

class CaseConversationManager {
    constructor() {
        this.currentCase = null;
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
        
        if (!caseStructure) {
            throw new Error(`No case structure found for type: ${caseType}`);
        }
        
        this.currentCase = {
            id: Date.now().toString(),
            caseType: caseType,
            structure: caseStructure,
            currentQuestionIndex: 0, // Start with first question
            answers: {},
            complete: false
        };
        
        // Return the first question
        return this.getCurrentQuestionResponse();
    }
    
    /**
     * Process user response to current question
     * @param {string} userResponse - The user's response
     * @returns {Object} Next question or completion status
     */
    async processUserResponse(userResponse) {
        if (!this.currentCase) {
            throw new Error('No active case. Please start a case first.');
        }
        
        // Store the current answer
        const currentQuestion = this.getCurrentQuestion();
        this.currentCase.answers[currentQuestion.id] = userResponse;
        
        // Move to next question
        this.currentCase.currentQuestionIndex++;
        
        // Check if we have more questions
        if (this.currentCase.currentQuestionIndex < this.currentCase.structure.questions.length) {
            // Skip conditional questions if needed
            return this.getCurrentQuestionResponse();
        } else {
            // All questions completed
            this.currentCase.complete = true;
            return {
                message: `Thank you for providing all the information. I have collected the following details for your ${this.currentCase.structure.title}:\n\n${this.generateSummary()}`,
                isComplete: true,
                caseData: this.currentCase.answers
            };
        }
    }
    
    /**
     * Get current question response, handling conditional logic
     * @returns {Object} Question response object
     */
    getCurrentQuestionResponse() {
        const question = this.getCurrentQuestion();
        
        // Check if this question should be skipped due to conditional logic
        if (question.conditionalOn) {
            const conditionQuestion = question.conditionalOn.questionId;
            const conditionValue = question.conditionalOn.value;
            
            if (this.currentCase.answers[conditionQuestion] !== conditionValue) {
                // Skip this question and move to next
                this.currentCase.currentQuestionIndex++;
                
                // Check if we still have questions
                if (this.currentCase.currentQuestionIndex < this.currentCase.structure.questions.length) {
                    return this.getCurrentQuestionResponse(); // Recursive call to check next question
                } else {
                    // No more questions
                    this.currentCase.complete = true;
                    return {
                        message: `Thank you for providing all the information. Your case details have been recorded.`,
                        isComplete: true,
                        caseData: this.currentCase.answers
                    };
                }
            }
        }
        
        // Format the question
        let questionText = question.question;
        
        // Add options if available
        if (question.options && question.options.length > 0) {
            questionText += "\n\nPlease choose from:\n" + question.options.map((option, index) => `${index + 1}. ${option}`).join('\n');
        }
        
        // Add progress indicator
        const progress = `(Question ${this.currentCase.currentQuestionIndex + 1} of ${this.currentCase.structure.questions.length})`;
        questionText = `${progress}\n\n${questionText}`;
        
        return {
            message: questionText,
            options: question.options || [],
            questionType: question.type,
            required: question.required
        };
    }
    
    /**
     * Get the current question object
     * @returns {Object} Current question
     */
    getCurrentQuestion() {
        if (!this.currentCase || this.currentCase.currentQuestionIndex >= this.currentCase.structure.questions.length) {
            throw new Error('No current question available.');
        }
        
        return this.currentCase.structure.questions[this.currentCase.currentQuestionIndex];
    }
    
    /**
     * Generate a summary of collected answers
     * @returns {string} Formatted summary
     */
    generateSummary() {
        const answers = this.currentCase.answers;
        const questions = this.currentCase.structure.questions;
        
        let summary = "";
        
        for (const question of questions) {
            if (answers[question.id]) {
                summary += `• ${question.question}\n  Answer: ${answers[question.id]}\n\n`;
            }
        }
        
        return summary;
    }
    
    /**
     * Check if case is complete
     * @returns {boolean} Whether all required questions are answered
     */
    isComplete() {
        return this.currentCase && this.currentCase.complete;
    }
    
    /**
     * Get case data
     * @returns {Object} Current case data
     */
    getCaseData() {
        return this.currentCase ? {
            caseType: this.currentCase.caseType,
            answers: this.currentCase.answers,
            complete: this.currentCase.complete
        } : null;
    }
}

module.exports = CaseConversationManager;