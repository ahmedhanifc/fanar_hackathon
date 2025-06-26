# Fanar Legal Assistant

A web-based application designed to serve as a legal guide for individuals in Qatar following an incident, such as a phishing attack, car accident, or workplace dispute.

## Project Overview

This application uses the Fanar AI API to provide legal guidance through a conversational interface. It offers:

1. Empathetic chat support for users in distress
2. Structured case information gathering
3. Legal analysis and advice based on Qatar's laws
4. Formal report generation with legal citations
5. Options to connect with lawyers or report to authorities

## Project Structure

```
fanar_hackathon/
├── legal_references/           # Legal reference documents
│   ├── law_13_2016_pdppl.txt
│   ├── law_14_2014_cybercrimes.txt
│   └── law_16_2010_electronic_transactions.txt
├── public/                     # Static assets
│   ├── css/                    # Stylesheets
│   │   ├── chat.css            # Chat interface styling
│   │   └── style.css           # General styling
│   ├── img/                    # Images and icons
│   │   └── logo.png
│   └── js/                     # Client-side JavaScript
│       └── chat.js             # Chat functionality
├── src/                        # Server-side code
│   ├── api/                    # API routes
│   │   ├── cases.routes.js     # Case management routes
│   │   ├── chat.routes.js      # Chat functionality routes
│   │   ├── home.routes.js      # Home page routes
│   │   ├── lawyer.routes.js    # Lawyer dashboard routes
│   │   └── reportController.js # Report generation
│   ├── core/                   # Core functionality
│   │   ├── case_conversation.js # Case conversation manager
│   │   ├── case_structure.js   # Case structure definitions
│   │   └── fanar_service.js    # Fanar API integration
│   └── prompts/                # LLM prompts
│       ├── case_question_list.json
│       ├── conversation_prompts.js
│       └── empathetic_template.md
├── templates/                  # Handlebars templates
│   ├── layouts/
│   │   └── main.handlebars     # Main layout template
│   ├── reports/                # Report templates
│   │   └── phishing_sms_case.english.txt
│   ├── chat.handlebars         # Chat interface
│   ├── chat_test.handlebars    # Testing interface
│   ├── history.handlebars      # Chat history view
│   ├── home.handlebars         # Homepage
│   ├── lawyer-dashboard.handlebars # Lawyer dashboard
│   └── submitted.handlebars    # Submission confirmation
├── .env                        # Environment variables (not in repo)
├── .gitignore                  # Git ignore file
├── fanar_api_docs.md           # Fanar API documentation
├── package.json                # Node.js dependencies
├── README.md                   # Project documentation
└── server.js                   # Main application entry point
```

## Setup Instructions

1. Clone the repository
2. Install dependencies with `npm install`
3. Create a `.env` file with your Fanar API key:
   ```
   FANAR_API_KEY=your_api_key_here
   ```
4. Start the server with `npm start`
5. Access the application at http://localhost:3000

## Development

To run the application in development mode with automatic restarts:

```
npm run dev
```

## Current Case Types

- Phishing SMS Case - Help for victims of SMS-based phishing attacks

## Contributors

- Team Fanar Hackathon

Platform: Web-based mobile application.
Front-End: HTML, CSS, JavaScript.
Back-End: Node.js, Handlebars.
Core Technology: Fanar API for LLM and multimodal capabilities.
Key Features:
Multimodal Input: Accepts text, voice commands, and image uploads.
AI-Powered Guidance: An interactive chatbot guides the user.
Automated Report Generation: Creates formal reports in English and Arabic.
## 5. Team Roles & Responsibilities
The team is divided into three focused groups:

Front-End: Responsible for designing and developing a user-friendly, intuitive mobile interface.
Back-End: Responsible for server logic, integrating the Fanar API, and ensuring proper data flow.
Research: Responsible for defining the structure of legal reports for different case types and designing effective prompts for the LLM