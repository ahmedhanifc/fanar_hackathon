const express = require('express');
const router = express.Router();

const { getFanarChatCompletion } = require("../core/fanar_service")
// const personaPrompt = require('../prompts/persona.js');
const personaPrompt = "Give the response in arabic: "


// @route   POST /api/chat
// @desc    Handles chat messages and gets a response from Fanar
// @access  Public

router.post("/chat", async (req,res) => {
    try{
        const userMessage = req.body.message;

        if(!userMessage){
            return res.status(400).json({ error: 'Message is required.' });
        }

        const botReply = await getFanarChatCompletion(userMessage, personaPrompt)
        res.json({ reply: botReply });
    } catch (error){
        // Use 500 for server-side errors
        res.status(500).json({ error: error.message });
    }
})

// other chat related routes
// GET /api/chat/history

module.exports = router;