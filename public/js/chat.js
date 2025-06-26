/**
 * Chat Interface Client-Side Logic
 * Handles user interactions, message sending, and conversation state
 */
document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const chatForm = document.getElementById('chat-form');
    const userMessageInput = document.getElementById('user-message');
    const chatMessages = document.getElementById('chat-messages');
    const sendButton = document.getElementById('send-button');

    // Chat state
    let conversationId = null;
    let chatHistory = [];
    let isProcessing = false;

    /**
     * Initialize the chat interface
     */
    function initChat() {
        // Focus on input field
        userMessageInput.focus();
        
        // Attach event listeners
        chatForm.addEventListener('submit', handleMessageSubmit);
    }

    /**
     * Handle message submission
     */
    async function handleMessageSubmit(e) {
        e.preventDefault();
        
        const userMessage = userMessageInput.value.trim();
        if (!userMessage || isProcessing) return;
        
        // Clear input field
        userMessageInput.value = '';
        
        // Add user message to UI
        addMessageToUI('user', userMessage);
        
        // Show typing indicator
        showTypingIndicator();
        
        // Track state
        isProcessing = true;
        
        try {
            // Add to history
            chatHistory.push({ role: 'user', content: userMessage });
            
            // Send to server
            let response;
            
            if (conversationId) {
                // Use structured conversation
                response = await sendMessageToConversation(userMessage);
            } else {
                // Use legacy/open chat
                response = await sendLegacyMessage(userMessage);
            }
            
            // Process response
            handleBotResponse(response);
        } catch (error) {
            console.error('Error sending message:', error);
            removeTypingIndicator();
            addMessageToUI('bot', 'Sorry, there was an error processing your message. Please try again.');
        } finally {
            isProcessing = false;
        }
    }

    /**
     * Send message to a structured conversation
     */
    async function sendMessageToConversation(message) {
        const response = await fetch('/api/chat/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                conversationId: conversationId,
                message: message
            })
        });
        
        if (!response.ok) {
            throw new Error('Failed to send message');
        }
        
        return await response.json();
    }

    /**
     * Send message using the legacy API (open-ended chat)
     */
    async function sendLegacyMessage(message) {
        const response = await fetch('/api/chat/legacy', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                history: chatHistory.slice(0, -1), // Exclude the message we just added
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
     * Start a new case conversation
     */
    async function startNewCase(caseType = 'phishing_sms_case', language = 'english') {
        const response = await fetch('/api/chat/start-case', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                caseType: caseType,
                language: language
            })
        });
        
        if (!response.ok) {
            throw new Error('Failed to start case');
        }
        
        const data = await response.json();
        conversationId = data.conversationId;
        
        // Clear chat and add initial message
        clearChat();
        addMessageToUI('bot', data.message);
        
        return data;
    }

    /**
 * Handle the bot's response
 */
function handleBotResponse(response) {
    removeTypingIndicator();
    
    // Add bot message to UI with options if provided
    addMessageToUI('bot', response.message, response.options);
    
    // Add to history
    chatHistory.push({ role: 'assistant', content: response.message });
    
    // Check if conversation is complete
    if (response.isComplete) {
        // Store case data for potential report generation
        if (response.caseData) {
            localStorage.setItem('lastCaseData', JSON.stringify(response.caseData));
        }
        
        conversationId = null;
        // Here you could trigger report generation or other final steps
    }
}

    /**
 * Add bot message to UI
 */
function addMessageToUI(role, content, options = []) {
    const messageDiv = document.createElement('div');
    messageDiv.classList.add('message', role);
    
    const contentDiv = document.createElement('div');
    contentDiv.classList.add('message-content');
    contentDiv.textContent = content;
    
    messageDiv.appendChild(contentDiv);
    
    // Add options if provided
    if (options && options.length > 0) {
        const optionsDiv = document.createElement('div');
        optionsDiv.classList.add('message-options');
        
        options.forEach(option => {
            const optionButton = document.createElement('button');
            optionButton.classList.add('option-button');
            optionButton.textContent = option;
            optionButton.addEventListener('click', () => {
                // When option is clicked, send as a user message
                userMessageInput.value = option;
                chatForm.dispatchEvent(new Event('submit'));
                
                // Remove all option buttons
                document.querySelectorAll('.message-options').forEach(el => el.remove());
            });
            
            optionsDiv.appendChild(optionButton);
        });
        
        messageDiv.appendChild(optionsDiv);
    }
    
    chatMessages.appendChild(messageDiv);
    
    // Scroll to bottom
    scrollToBottom();
}

    /**
     * Show typing indicator
     */
    function showTypingIndicator() {
        const typingDiv = document.createElement('div');
        typingDiv.classList.add('message', 'bot', 'typing-indicator');
        typingDiv.id = 'typing-indicator';
        
        for (let i = 0; i < 3; i++) {
            const dot = document.createElement('span');
            typingDiv.appendChild(dot);
        }
        
        chatMessages.appendChild(typingDiv);
        scrollToBottom();
    }

    /**
     * Remove typing indicator
     */
    function removeTypingIndicator() {
        const typingIndicator = document.getElementById('typing-indicator');
        if (typingIndicator) {
            typingIndicator.remove();
        }
    }

    /**
     * Clear chat messages
     */
    function clearChat() {
        chatMessages.innerHTML = '';
        chatHistory = [];
    }

    /**
     * Scroll chat to bottom
     */
    function scrollToBottom() {
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    // Initialize chat
    initChat();

    // Make functions available globally (for debugging and development)
    window.fanarChat = {
        startCase: startNewCase,
        clearChat: clearChat
    };
});
