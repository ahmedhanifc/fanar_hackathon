const express = require('express');
const router = express.Router();

// Home page
router.get("/", async (req, res) => {
    res.render("home")
})

// Chat page
router.get('/chat', (req, res) => {
    res.render('chat', {
        title: 'Chat with Fanar Legal Assistant',
        pageDescription: 'Get help with your legal case'
    });
});

// Chat test page (for development)
router.get('/chat-test', (req, res) => {
    res.render('chat_test');
});

module.exports = router;