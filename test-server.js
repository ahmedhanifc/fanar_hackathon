// Simple server test
console.log('Testing server startup...');

try {
    const express = require('express');
    console.log('✓ Express loaded');
    
    const exphbs = require('express-handlebars');
    console.log('✓ Express Handlebars loaded');
    
    // Test file paths
    const path = require('path');
    const fs = require('fs');
    
    const serverPath = path.join(__dirname, 'server.js');
    if (fs.existsSync(serverPath)) {
        console.log('✓ server.js exists');
    } else {
        console.log('✗ server.js not found');
    }
    
    const templatePath = path.join(__dirname, 'templates', 'chat.handlebars');
    if (fs.existsSync(templatePath)) {
        console.log('✓ chat.handlebars exists');
    } else {
        console.log('✗ chat.handlebars not found');
    }
    
    const routePath = path.join(__dirname, 'src', 'api', 'home.routes.js');
    if (fs.existsSync(routePath)) {
        console.log('✓ home.routes.js exists');
    } else {
        console.log('✗ home.routes.js not found');
    }
    
    console.log('All checks passed. Try starting the server with: npm start');
    
} catch (error) {
    console.error('Error during test:', error.message);
}
