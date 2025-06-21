const express = require('express');
const router = express.Router();

// Home page
router.get("/", async (req, res) => {
    res.render("home")
})

router.get('/chat', (req, res) => {
    res.render('chat'); // This will render templates/chat.handlebars
});

module.exports = router;