const express = require('express');
const router = express.Router();

// @route   GET /api/lawyer/dashboard
// @desc    Lawyer dashboard
// @access  Protected (should have authentication in production)
router.get("/dashboard", (req, res) => {
    res.render('lawyer-dashboard', {
        title: 'Lawyer Dashboard',
        cases: [] // In a real implementation, fetch cases from a database
    });
});

module.exports = router;
