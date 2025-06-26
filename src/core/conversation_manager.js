/**
 * Simple conversation state management
 * In production, this would be stored in a database
 */
class ConversationManager {
    constructor() {
        this.conversations = new Map();
    }

    /**
     * Get conversation state or create new one
     * @param {string} conversationId 
     * @returns {Object} conversation state
     */
    getConversation(conversationId) {
        if (!this.conversations.has(conversationId)) {
            this.conversations.set(conversationId, {
                id: conversationId,
                mode: 'GENERATIVE', // GENERATIVE or REPORT
                messageCount: 0,
                createdAt: new Date(),
                lastActivity: new Date()
            });
        }
        
        const conversation = this.conversations.get(conversationId);
        conversation.lastActivity = new Date();
        return conversation;
    }

    /**
     * Update conversation state
     * @param {string} conversationId 
     * @param {Object} updates 
     */
    updateConversation(conversationId, updates) {
        const conversation = this.getConversation(conversationId);
        Object.assign(conversation, updates);
        this.conversations.set(conversationId, conversation);
    }

    /**
     * Check if conversation should show report prompt
     * @param {Object} conversation 
     * @returns {boolean}
     */
    shouldShowReportPrompt(conversation) {
        // Show report prompt after 3+ messages in generative mode
        return conversation.mode === 'GENERATIVE' && conversation.messageCount >= 3;
    }
}

module.exports = ConversationManager;