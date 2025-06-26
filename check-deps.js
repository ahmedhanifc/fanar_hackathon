#!/usr/bin/env node

console.log('Checking dependencies...');

const requiredDeps = [
    'express',
    'express-handlebars', 
    'dotenv',
    'openai',
    'uuid'
];

for (const dep of requiredDeps) {
    try {
        require(dep);
        console.log(`✓ ${dep} - OK`);
    } catch (error) {
        console.log(`✗ ${dep} - MISSING (${error.message})`);
    }
}

console.log('\nIf any dependencies are missing, run: npm install');
