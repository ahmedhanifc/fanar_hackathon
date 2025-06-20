# Technical


# Legal Guidance Application

## 1. Project Concept
A web-based mobile application designed to serve as a legal guide for individuals in Qatar following an incident, such as a car accident or a workplace dispute.

## 2. Stakeholders & Users

Primary User: The general public in Qatar needing legal guidance.
Secondary User: Lawyers and law firms seeking efficiently summarized cases.

## 3. User Experience Flow

For the Individual:

The user describes their case to the application via text, voice, or by uploading evidence (images).
An LLM-powered chatbot (Fanar) analyzes the input and asks targeted questions to gather all necessary details.
Upon gathering sufficient information, the app generates a formal, law-based report, available in either English or Arabic.
The user has two options:
Automatically forward the report to a database of registered lawyers/law firms.
Download the report to present personally to a law firm or the police.
For the Lawyer/Law Firm:

Access a dashboard listing new cases submitted through the app.
Review detailed, pre-structured reports in their preferred language.
This saves significant time in initial client consultation and report drafting.

## 4. MVP Technical Specifications

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