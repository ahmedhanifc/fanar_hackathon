const express = require('express');
const exphbs = require('express-handlebars');
const path = require('path');
require('dotenv').config();

const app = express();

// Static file serving
app.use(express.static('public'));

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));


// Middleware
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// Handlebars setup
app.engine('handlebars', exphbs.engine({ defaultLayout: 'main', layoutsDir: path.join(__dirname, 'templates/layouts') }));
app.set('view engine', 'handlebars');
app.set('views', path.join(__dirname, 'templates'));

// Routes
app.use('/api/chat', require('./src/api/chat.routes.js'));
app.use('/api/cases', require('./src/api/cases.routes.js'));
app.use('/api/lawyer', require('./src/api/lawyer.routes.js'));
app.use('/', require('./src/api/home.routes.js'));

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
    console.log(`-----------------------------------------`);
    console.log(`Web interface: http://localhost:${PORT}`);
    console.log(`Chat interface: http://localhost:${PORT}/chat`);
    console.log(`-----------------------------------------`);
    console.log(`API endpoints available:`);
    console.log(`  - /api/chat/* (Chat functionality)`);
    console.log(`  - /api/cases/* (Case management)`);
    console.log(`  - /api/lawyer/* (Lawyer dashboard)`);
});
