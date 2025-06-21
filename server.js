const express = require('express');
const exphbs = require('express-handlebars');
const path = require('path');
require('dotenv').config();

const app = express();
app.use(express.static('images'));


app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// Handlebars setup
app.engine('handlebars', exphbs.engine({ defaultLayout: 'main', layoutsDir: path.join(__dirname, 'templates/layouts') }));
app.set('view engine', 'handlebars');
app.set('views', path.join(__dirname, 'templates'));

// Routes
app.use('/api/chat', require('./src/api/chat.routes.js'));
app.use('/api/cases', require('./src/api/cases.routes.js'));
app.use('/api/lawyer', require('./src/api/lawyer.routes.js'));
app.use('/', require('./src/api/home.routes.js'));
app.get("/chat", (req, res) => {
    res.render("chat");
});



// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Something went wrong!' });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: 'Route not found' });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    console.log(`API endpoints available:`);
    console.log(`  - /api/cases/* (Case management)`);
    console.log(`  - /api/lawyer/* (Lawyer dashboard)`);
    console.log(`  - /api/chat/* (Chat functionality)`);
});
