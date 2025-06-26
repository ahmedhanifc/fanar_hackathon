// Your existing sendMessage function is correct
async function sendMessage() {
    console.log("Sending Message...")
    const messageInput = document.getElementById('messageInput');
    const message = messageInput.value.trim();
    
    if (!message) return;
    
    // Clear input
    messageInput.value = '';
    
    // Add user message to chat
    addMessageToChat(message, 'user');
    
    try {
        // Show typing indicator
        showTypingIndicator();
        
        // Send to Fanar API via your backend
        const response = await fetch('/api/chat/message', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ message }),
        });
        
        if (!response.ok) {
            throw new Error('Failed to send message');
        }
        
        const data = await response.json();
        
        // Remove typing indicator
        hideTypingIndicator();
        
        // Add bot response to chat
        addMessageToChat(data.botResponse, 'bot');
        
    } catch (error) {
        console.error('Error sending message:', error);
        hideTypingIndicator();
        addMessageToChat('Sorry, I\'m having trouble connecting right now. Please try again.', 'bot');
    }
}

// ADD THESE MISSING FUNCTIONS:

// Function to add messages to chat
function addMessageToChat(message, sender) {
    const chatMessages = document.getElementById('chat-messages');
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${sender}`;
    
    // Format the message if it's from the bot
    const formattedMessage = sender === 'bot' ? formatMessage(message) : message;
    
    messageDiv.innerHTML = `
        <div class="message-content">
            ${formattedMessage}
        </div>
    `;
    
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}


// Function to show typing indicator
function showTypingIndicator() {
    const chatMessages = document.getElementById('chat-messages');
    const typingDiv = document.createElement('div');
    typingDiv.className = 'message bot typing-indicator';
    typingDiv.id = 'typing-indicator';
    
    typingDiv.innerHTML = `
        <div class="message-content">
            <div class="typing-dots">
                <span></span>
                <span></span>
                <span></span>
            </div>
        </div>
    `;
    
    chatMessages.appendChild(typingDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Function to hide typing indicator
function hideTypingIndicator() {
    const typingIndicator = document.getElementById('typing-indicator');
    if (typingIndicator) {
        typingIndicator.remove();
    }
}

// Event listeners
document.addEventListener('DOMContentLoaded', function() {
    // Handle form submission
    document.getElementById('chat-form').addEventListener('submit', function(e) {
        e.preventDefault();
        sendMessage();
    });
    
    // Handle Enter key press
    document.getElementById('messageInput').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            sendMessage();
        }
    });
});

function formatMessage(message) {
    if (!message) return '';
    
    let formatted = message;

    // Remove all types of quotes at the beginning and end (including smart quotes)
    formatted = formatted.replace(/^["'`""'']+|["'`""'']+$/g, '');
    
    // Remove escaped quotes throughout the text
    formatted = formatted.replace(/\\"/g, '"');
    formatted = formatted.replace(/\\'/g, "'");
    
    // Remove any remaining leading/trailing whitespace after quote removal
    formatted = formatted.trim();

    // Remove escaped quotes at the beginning and end
    formatted = formatted.replace(/^["']|["']$/g, '');

    // Remove escaped quotes throughout the text
    formatted = formatted.replace(/\\"/g, '"');
    formatted = formatted.replace(/\\'/g, "'");
    
    // Convert bullet points (*, -, •) to HTML lists
    formatted = formatted.replace(/^\s*[\*\-\•]\s+(.+)$/gm, '<li>$1</li>');
    
    // Wrap consecutive list items in <ul> tags
    formatted = formatted.replace(/(<li>.*<\/li>)/gs, function(match) {
        return '<ul>' + match + '</ul>';
    });
    
    // Convert bullet points (*, -, •) to HTML lists
    formatted = formatted.replace(/^\s*[\*\-\•]\s+(.+)$/gm, '<li>$1</li>');
    // Convert **bold** to <strong>
    formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    
    // Convert *italic* to <em>
    formatted = formatted.replace(/\*(.*?)\*/g, '<em>$1</em>');
    
    // Convert headings (## Heading) to <h3>
    formatted = formatted.replace(/^##\s+(.+)$/gm, '<h3>$1</h3>');
    
    // Convert section separators (---) to <hr>
    formatted = formatted.replace(/^---$/gm, '<hr>');
    
    // Convert line breaks to <br>
    formatted = formatted.replace(/\n/g, '<br>');
    
    // Handle numbered lists (1. 2. 3.)
    formatted = formatted.replace(/^\s*(\d+)\.\s+(.+)$/gm, '<ol><li>$2</li></ol>');
    
    // Merge consecutive <ol> tags
    formatted = formatted.replace(/<\/ol>\s*<ol>/g, '');
    
    // Clean up any double <ul> tags
    formatted = formatted.replace(/<\/ul>\s*<ul>/g, '');

    // Convert bullet points (*, -, •) to HTML lists
    formatted = formatted.replace(/^\s*[\*\-\•]\s+(.+)$/gm, '<li>$1</li>');
    // Wrap consecutive list items in <ul> tags
    formatted = formatted.replace(/(<li>.*<\/li>)/gs, function(match) {
        return '<ul>' + match + '</ul>';
    });
    
    // Convert bullet points (*, -, •) to HTML lists
    formatted = formatted.replace(/^\s*[\*\-\•]\s+(.+)$/gm, '<li>$1</li>');
    // Convert **bold** to <strong>
    formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    
    // Convert *italic* to <em>
    formatted = formatted.replace(/\*(.*?)\*/g, '<em>$1</em>');
    
    // Convert headings (## Heading) to <h3>
    formatted = formatted.replace(/^##\s+(.+)$/gm, '<h3>$1</h3>');
    
    // Convert section separators (---) to <hr>
    formatted = formatted.replace(/^---$/gm, '<hr>');
    
    // Convert line breaks to <br>
    formatted = formatted.replace(/\n/g, '<br>');
    
    // Handle numbered lists (1. 2. 3.)
    formatted = formatted.replace(/^\s*(\d+)\.\s+(.+)$/gm, '<ol><li>$2</li></ol>');
    
    // Merge consecutive <ol> tags
    formatted = formatted.replace(/<\/ol>\s*<ol>/g, '');
    
    // Clean up any double <ul> tags
    formatted = formatted.replace(/<\/ul>\s*<ul>/g, '');

    return formatted;
}