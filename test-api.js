const axios = require('axios');

const BASE_URL = 'http://localhost:3000/api';

// Test the complete primary stakeholder flow
async function testPrimaryStakeholderFlow() {
    console.log('🧪 Testing Primary Stakeholder API Flow...\n');
    
    try {
        // Step 1: Start a new case
        console.log('1️⃣ Starting a new traffic accident case...');
        const startResponse = await axios.post(`${BASE_URL}/cases/start`, {
            caseType: 'traffic_accident',
            language: 'english'
        });
        
        const { conversationId, message } = startResponse.data;
        console.log('✅ Case started successfully!');
        console.log('Conversation ID:', conversationId);
        console.log('First message:', message);
        console.log('');
        
        // Step 2: Send user responses
        const testResponses = [
            "Last Friday around 3 PM",
            "On Al Corniche Street near the Museum of Islamic Art",
            "Collision with another vehicle",
            "Toyota",
            "Camry",
            "2020",
            "ABC-1234",
            "Yes, I have insurance with Qatar Insurance",
            "Yes, I was driving",
            "No passengers",
            "No, I wasn't injured",
            "No medical attention needed",
            "Yes, police were called",
            "Yes, I have the report number: PR-2024-001",
            "The other driver ran a red light and hit me from the side"
        ];
        
        console.log('2️⃣ Processing user responses...');
        let currentResponse = null;
        
        for (let i = 0; i < testResponses.length; i++) {
            console.log(`User: ${testResponses[i]}`);
            
            const chatResponse = await axios.post(`${BASE_URL}/cases/chat`, {
                conversationId: conversationId,
                message: testResponses[i]
            });
            
            currentResponse = chatResponse.data;
            console.log(`Assistant: ${currentResponse.message}`);
            console.log(`Complete: ${currentResponse.isComplete}`);
            console.log('');
            
            if (currentResponse.isComplete) {
                break;
            }
        }
        
        // Step 3: Generate report
        if (currentResponse.isComplete && currentResponse.caseData) {
            console.log('3️⃣ Generating report...');
            const reportResponse = await axios.post(`${BASE_URL}/cases/generate-report`, {
                caseData: currentResponse.caseData,
                language: 'english'
            });
            
            console.log('✅ Report generated successfully!');
            console.log('Filename:', reportResponse.data.filename);
            console.log('Download URL:', reportResponse.data.downloadUrl);
            console.log('');
            
            // Step 4: Check conversation status
            console.log('4️⃣ Checking conversation status...');
            const statusResponse = await axios.get(`${BASE_URL}/cases/status/${conversationId}`);
            console.log('Status:', statusResponse.data);
            
        }
        
        console.log('🎉 Primary stakeholder flow completed successfully!');
        
    } catch (error) {
        console.error('❌ Error:', error.response?.data || error.message);
    }
}

// Test getting available case types
async function testGetCaseTypes() {
    console.log('\n📋 Testing Get Case Types...');
    try {
        const response = await axios.get(`${BASE_URL}/cases/types`);
        console.log('Available case types:', response.data);
    } catch (error) {
        console.error('Error getting case types:', error.response?.data || error.message);
    }
}

// Run tests
async function runTests() {
    await testGetCaseTypes();
    await testPrimaryStakeholderFlow();
}

// Check if axios is installed
try {
    require('axios');
    runTests();
} catch (error) {
    console.log('❌ Axios not installed. Please run: npm install axios');
    console.log('Then run: node test-api.js');
} 