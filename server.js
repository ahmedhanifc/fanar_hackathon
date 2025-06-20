const express = require('express');
const exphbs = require('express-handlebars');
const path = require('path');
require('dotenv').config();

const app = express();
const homeRoutes = require('./src/api/home.routes');



//All the Routers of Our Application

const homeRouter = require("./src/api/home.routes");
const chatRoutes = require("./src/api/chat.routes")

app.set('views', __dirname + '/templates');
app.engine('handlebars', exphbs.engine({ defaultLayout: 'main', layoutsDir: 'templates/layouts' }));
app.set('view engine', 'handlebars');
app.set('views', path.join(__dirname, 'templates'));

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Use your routes
app.use('/', homeRoutes);

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
});
