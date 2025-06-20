const fs = require('fs/promises');
const path = require('path');
const dbPath = path.join(__dirname, '..', '..', 'db', 'conversations.json');

async function readDb() {
    try {
        const data = await fs.readFile(dbPath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        if (error.code === 'ENOENT') {
            return [];
        }
        throw error;
    }
}

async function writeDb(data) {
    await fs.writeFile(dbPath, JSON.stringify(data, null, 2));
}

async function getAllConversations() {
    const conversations = await readDb();
    return conversations.map(c => ({ id: c.id, lastUpdated: c.lastUpdated }));
}

async function saveConversation(history, id = null) {
    const allConversations = await readDb();
    let conversationId = id;

    if (conversationId) {
        const conversationIndex = allConversations.findIndex(c => c.id === conversationId);
        if (conversationIndex !== -1) {
            allConversations[conversationIndex].history = history;
            allConversations[conversationIndex].lastUpdated = new Date().toISOString();
            console.log(`[Persistence: Conversation ${conversationId} updated.]`);
        }
    } else {
        conversationId = new Date().getTime(); 
        const newConversation = {
            id: conversationId,
            lastUpdated: new Date().toISOString(),
            history: history
        };
        allConversations.push(newConversation);
        console.log(`[Persistence: New conversation ${conversationId} saved.]`);
    }

    await writeDb(allConversations);
    return conversationId; 
}

async function getConversationById(id) {
    const allConversations = await readDb();
    return allConversations.find(convo => convo.id === id);
}

module.exports = { saveConversation, getConversationById, getAllConversations };