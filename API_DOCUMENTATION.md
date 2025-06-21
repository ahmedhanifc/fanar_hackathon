# Legal Assistant API Documentation

## Primary Stakeholder (Users Filing Complaints)

This API handles the complete flow for users filing legal complaints and cases.

---

## Base URL
```
http://localhost:3000/api
```

---

## Endpoints

### 1. Get Available Case Types
**GET** `/cases/types`

Returns available case types and their descriptions.

**Response:**
```json
{
  "success": true,
  "caseTypes": ["consumer_complaint", "traffic_accident"],
  "descriptions": {
    "consumer_complaint": "Issues with products or services purchased",
    "traffic_accident": "Vehicle-related incidents and accidents"
  }
}
```

---

### 2. Start a New Case
**POST** `/cases/start`

Starts a new case conversation.

**Request Body:**
```json
{
  "caseType": "traffic_accident",
  "language": "english"
}
```

**Response:**
```json
{
  "success": true,
  "conversationId": "1703123456789abc123",
  "message": "I'll help you document your traffic accident. When did the accident occur?",
  "options": null,
  "caseType": "traffic_accident",
  "language": "english"
}
```

---

### 3. Continue Case Conversation
**POST** `/cases/chat`

Send a message in an active case conversation.

**Request Body:**
```json
{
  "conversationId": "1703123456789abc123",
  "message": "Last Friday around 3 PM"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Where did the accident happen?",
  "options": null,
  "isComplete": false,
  "caseData": null
}
```

**When Complete:**
```json
{
  "success": true,
  "message": "Thank you for providing all the information. I'll now generate your case report.",
  "options": null,
  "isComplete": true,
  "caseData": {
    "caseType": "traffic_accident",
    "dateOfIncident": "2024-01-19 15:00",
    "location": "Al Corniche Street",
    // ... all collected case data
  }
}
```

---

### 4. Generate Report
**POST** `/cases/generate-report`

Generate a formal report from completed case data.

**Request Body:**
```json
{
  "caseData": {
    // Complete case data object
  },
  "language": "english"
}
```

**Response:**
```json
{
  "success": true,
  "report": "TRAFFIC ACCIDENT REPORT\n\nCase Information:\n- Case Type: Traffic Accident\n...",
  "filename": "traffic-accident-John-Doe-2024-01-19-english.txt",
  "filepath": "/path/to/reports/traffic-accident-John-Doe-2024-01-19-english.txt",
  "downloadUrl": "/api/cases/download-report/traffic-accident-John-Doe-2024-01-19-english.txt"
}
```

---

### 5. Download Report
**GET** `/cases/download-report/:filename`

Download a generated report file.

**Response:** File download

---

### 6. Check Conversation Status
**GET** `/cases/status/:conversationId`

Check the status of an active conversation.

**Response:**
```json
{
  "success": true,
  "conversationId": "1703123456789abc123",
  "caseType": "traffic_accident",
  "language": "english",
  "status": "in_progress",
  "isActive": true
}
```

---

## Complete User Flow Example

### Step 1: Start Case
```bash
curl -X POST http://localhost:3000/api/cases/start \
  -H "Content-Type: application/json" \
  -d '{"caseType": "traffic_accident", "language": "english"}'
```

### Step 2: Send Messages
```bash
curl -X POST http://localhost:3000/api/cases/chat \
  -H "Content-Type: application/json" \
  -d '{"conversationId": "1703123456789abc123", "message": "Last Friday around 3 PM"}'
```

### Step 3: Generate Report
```bash
curl -X POST http://localhost:3000/api/cases/generate-report \
  -H "Content-Type: application/json" \
  -d '{"caseData": {...}, "language": "english"}'
```

### Step 4: Download Report
```bash
curl -O http://localhost:3000/api/cases/download-report/traffic-accident-John-Doe-2024-01-19-english.txt
```

---

## Error Responses

All endpoints return consistent error responses:

```json
{
  "error": "Error message description"
}
```

Common HTTP status codes:
- `400` - Bad Request (invalid parameters)
- `404` - Not Found (conversation not found)
- `500` - Internal Server Error

---

## Testing

Run the test file to see the complete flow:
```bash
npm install axios
node test-api.js
```

---

## Next Steps

This API is ready for:
1. **Web UI**: Build a React/Vue frontend that uses these endpoints
2. **Mobile App**: Use these same endpoints for mobile development
3. **Lawyer Dashboard**: Add endpoints for lawyers to view cases (secondary stakeholder) 