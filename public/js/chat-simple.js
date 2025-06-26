/**
 * Simple Chat Interface - Minimal Version for Testing
 */
document.addEventListener('DOMContentLoaded', function() {
    console.log('Chat interface loaded');
    
    // DOM Elements
    const chatForm = document.getElementById('chat-form');
    const userMessageInput = document.getElementById('user-message');
    const chatMessages = document.getElementById('chat-messages');
    const sendButton = document.getElementById('send-button');

    if (!chatForm || !userMessageInput || !chatMessages || !sendButton) {
        console.error('Missing required DOM elements');
        return;
    }

    // Chat state
    let conversationId = null;
    let chatHistory = [];
    let isProcessing = false;

    /**
     * Handle message submission
     */
    async function handleMessageSubmit(e) {
        e.preventDefault();
        
        const userMessage = userMessageInput.value.trim();
        if (!userMessage || isProcessing) return;
        
        console.log('Sending message:', userMessage);
        
        // Clear input field
        userMessageInput.value = '';
        
        // Add user message to UI
        addMessageToUI('user', userMessage);
        
        // Track state
        isProcessing = true;
        
        try {
            // Add to history
            chatHistory.push({ role: 'user', content: userMessage });
            
            // Send to server (legacy chat for now)
            const response = await sendLegacyMessage(userMessage);
            
            // Process response
            handleBotResponse(response);
        } catch (error) {
            console.error('Error sending message:', error);
            addMessageToUI('bot', 'Sorry, there was an error processing your message. Please try again.');
        } finally {
            isProcessing = false;
        }
    }

    /**
     * Send message using the legacy API
     */
    async function sendLegacyMessage(message) {
        const response = await fetch('/api/chat/legacy', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                history: chatHistory.slice(0, -1),
                newMessage: message
            })
        });
        
        if (!response.ok) {
            throw new Error('Failed to send message');
        }
        
        const data = await response.json();
        return { message: data.reply };
    }

    /**
     * Handle the bot's response
     */
    function handleBotResponse(response) {
        // Add bot message to UI
        addMessageToUI('bot', response.message);
        
        // Add to history
        chatHistory.push({ role: 'assistant', content: response.message });
    }

    /**
     * Add a message to the UI
     */
    function addMessageToUI(role, content) {
        const messageDiv = document.createElement('div');
        messageDiv.classList.add('message', role);
        
        const contentDiv = document.createElement('div');
        contentDiv.classList.add('message-content');
        contentDiv.textContent = content;
        
        messageDiv.appendChild(contentDiv);
        chatMessages.appendChild(messageDiv);
        
        // Scroll to bottom
        scrollToBottom();
    }

    /**
     * Scroll chat to bottom
     */
    function scrollToBottom() {
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    // Initialize chat
    userMessageInput.focus();
    chatForm.addEventListener('submit', handleMessageSubmit);
    
    console.log('Chat interface initialized');
});
