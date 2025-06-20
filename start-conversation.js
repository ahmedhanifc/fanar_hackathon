require('dotenv').config();
const readline = require('readline');
const { getFanarChatCompletion } = require('./src/core/fanar_service.js');
const { saveConversation, getConversationById, getAllConversations } = require('./src/core/persistence.js');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});


async function chat(history, conversationId) {
    rl.question('You: ', async (userInput) => {
        if (userInput.toLowerCase() === 'exit' || userInput.toLowerCase() === 'quit') {
            console.log('Exiting conversation. Goodbye!');
            rl.close();
            return;
        }

        try {
            history.push({ role: 'user', content: userInput });

            console.log('Assistant is typing...');
            const assistantReply = await getFanarChatCompletion(history);
            history.push({ role: 'assistant', content: assistantReply });
            console.log(`Assistant: ${assistantReply}`);
            
            const newId = await saveConversation(history, conversationId);
            
            // Continue the loop, passing the updated history and the same ID
            chat(history, newId);

        } catch (error) {
            console.error('An error occurred:', error.message);
            chat(history, conversationId); // Continue loop even on error
        }
    });
}

async function selectAndLoadConversation() {
    const conversations = await getAllConversations();
    if (conversations.length === 0) {
        console.log('No saved conversations found.');
        return null;
    }

    console.log('\nPlease select a conversation to load:');
    conversations.forEach((convo, index) => {
        console.log(`${index + 1}: Conversation from ${new Date(convo.lastUpdated).toLocaleString()}`);
    });

    return new Promise(resolve => {
        rl.question('Enter number: ', async (number) => {
            const index = parseInt(number, 10) - 1;
            if (index >= 0 && index < conversations.length) {
                const selectedId = conversations[index].id;
                const fullConversation = await getConversationById(selectedId);
                console.log(`\n--- Conversation loaded. Last message: ---`);
                console.log(fullConversation.history.slice(-1)[0]);
                console.log(`----------------------------------------\n`);
                resolve(fullConversation);
            } else {
                console.log('Invalid selection.');
                resolve(null);
            }
        });
    });
}


async function main() {
    rl.question('(N)ew or (L)oad conversation? ', async (choice) => {
        if (choice.toLowerCase() === 'l') {
            const loadedSession = await selectAndLoadConversation();
            if (loadedSession) {
                // Start chat with loaded data
                chat(loadedSession.history, loadedSession.id);
            } else {
                rl.close();
            }
        } else {
            // Start a new chat session
            console.log('Starting new conversation. Type "exit" or "quit" to end.');
            const initialHistory = [{ 
                role: "system", 
                content: "You are a helpful legal assistant in Qatar..." 
            }];
            chat(initialHistory, null); // Pass null ID for a new conversation
        }
    });
}

main();