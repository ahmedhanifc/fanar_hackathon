const express = require('express');
const router = express.Router();

// Home page
router.get("/", async (req, res) => {
    res.render("home")
})

// Simulated chat page (MVP demo)
router.get("/chat", (req, res) => {
    // Dummy conversation for demo
    res.render("chat", {
        conversation: [
            { role: "assistant", content: "I'll help you solve your cat mystery: What is your cat's name?" },
            { role: "user", content: "Whiskers" },
            { role: "assistant", content: "How old is your cat?" }
        ],
        conversationId: "1234567890"
    });
});

// Simulate chat form submission (no backend logic, just echo for demo)
router.post("/chat/send", (req, res) => {
    const { conversationId, message } = req.body;
    // For demo, append the user's message and a dummy bot reply
    const conversation = [
        { role: "assistant", content: "I'll help you solve your cat mystery: What is your cat's name?" },
        { role: "user", content: "Whiskers" },
        { role: "assistant", content: "How old is your cat?" },
        { role: "user", content: message },
        { role: "assistant", content: "Thanks for sharing! (This is a simulated reply.)" }
    ];
    res.render("chat", {
        conversation,
        conversationId
    });
});

module.exports = router;