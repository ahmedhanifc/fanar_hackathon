const express = require('express');
const router = express.Router();

// Home page
router.get("/", async (req, res) => {
    res.render("home")
})

module.exports = router;