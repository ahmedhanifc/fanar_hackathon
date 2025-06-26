# Correct Conversational Flow Documentation

## Overview

The CaseConversationManager implements the correct conversational flow that focuses on the app's core purpose: creating formal legal reports and providing legal guidance.

## Flow Structure

### 1. Conversation Mode (Default)
**Purpose**: Listen empathetically, ask open-ended questions, always end with offering legal guidance/reports

**Flow**:
1. **User shares brief description** of their problem
2. **LLM listens empathetically** and acknowledges their stress
3. **LLM asks open-ended questions** to understand more about their problem
4. **LLM always ends** by offering to help with legal guidance and report creation
5. **User agrees** to start the report process
6. **Transition to checklist mode** with rule-based questions

**Example Flow**:
```
User: "im super stressed i received an sms to pay for my speeding fine and apparently the link provided was a scam! i got scammed!"
Assistant: "I'm so sorry you're going through this. That sounds really stressful. Could you tell me more about what happened?"

User: "I clicked the link and entered my card details. I feel so stupid!"
Assistant: "I understand how frustrating and scary this must be. Please don't be too hard on yourself - these scams are designed to look very convincing. How did you find out it was a scam?"

User: "I got suspicious and checked with the real traffic department"
Assistant: "Thank you for sharing this with me. I can help you create a formal legal report and provide legal guidance. Would you like to start the report process?"

User: "yes"
Assistant: "Perfect! I'll help you create a formal legal report. I'll ask you some questions to gather the necessary information. Are you ready to start?"
```

### 2. Checklist Mode
**Purpose**: Use rule-based questions from case_structure.js to gather information

**Flow**:
1. **Confirm user wants to start** the checklist process
2. **Ask questions sequentially** from case_structure.js
3. **Extract and validate information** using LLM
4. **Handle skip responses** appropriately
5. **Complete all questions** and transition to legal advice mode

**Features**:
- LLM-powered information extraction
- Date parsing with chrono-node fallback
- Skip handling for optional fields
- Validation against field configurations

### 3. Legal Advice Mode
**Purpose**: Give specific options after completing the questions

**Options Presented**:
1. **Legal Guidance**: Provide specific legal advice and cite relevant Qatar authorities and law firms
2. **Structured Report**: Generate a formal legal report for submission
3. **Law Firm Contact**: Contact a law firm on user's behalf with case details
4. **Just the Report**: Simply provide the completed report

**Example**:
```
Assistant: "Thank you for providing all the information. Here are your options:

1. **Legal Guidance**: I can provide specific legal advice and cite relevant Qatar authorities and law firms
2. **Structured Report**: I can generate a formal legal report for you to submit
3. **Law Firm Contact**: I can contact a law firm on your behalf with your case details
4. **Just the Report**: I can simply provide you with the completed report

Which option would you prefer?"

User: "1"
Assistant: [Provides Qatar-specific legal guidance with authorities and law firms]
```

### 4. Agentic Action Mode
**Purpose**: Contact law firms on user's behalf

**Flow**:
1. **Present law firm options** based on case type
2. **User selects law firm** by number or name
3. **Generate professional email** with case details
4. **Confirm and send** email on user's behalf

## Key Features

- **Empathetic Listening**: Always listens and understands first
- **Open-Ended Questions**: Asks questions to understand the problem better
- **Always Ends with Purpose**: Every conversation ends by offering legal guidance/reports
- **Rule-Based Questions**: Uses structured questions from case_structure.js
- **Specific Options**: Gives clear choices after completing questions
- **Qatar-Specific**: Focuses on Qatar laws, authorities, and procedures
- **Concise Responses**: Keeps responses short and focused

## Benefits

1. **Natural Flow**: Users can share their problems naturally
2. **Empathetic Support**: Provides emotional support while maintaining purpose
3. **Structured Process**: Uses rule-based questions for consistency
4. **Clear Options**: Gives specific choices after gathering information
5. **Legal Focus**: Always guides toward legal assistance and report creation
6. **Qatar-Specific**: Provides relevant local legal guidance