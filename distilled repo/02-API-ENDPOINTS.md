# API Endpoints

## Overview

RESTful JSON APIs for all operations. Routes support both root path (`/`) and subdirectory (`/epsilon/`) for production deployment.

## Authentication Routes

### GET `/auth-status`
Check if user is authenticated.

**Response:** `{authenticated: bool, email?: string}`

### POST `/verify-google-token`
Verify Google OAuth token and create session.

**Request:** `{token: string}`

**Response:** `{success: bool, user?: {id, email}, error?: string}`

### POST `/logout`
Log out and clear session.

**Response:** `{success: bool}`

### GET `/login`
Render Google OAuth login page.

## Data Management Routes

### POST `/add_row`
Add single data point.

**Request:** `{Date: string, Variable_1: number, ...}`

**Response:** `{status: "success"|"error", message?: string}`

### GET `/get_data`
Retrieve all user's data points.

**Response:** Array of data objects with Date and variables

### POST `/replace_data`
Replace all user data (for bulk updates).

**Request:** `{data: Array}`

**Response:** `{status: "success"|"error"}`

### POST `/clear_data`
Delete all user's data points.

**Response:** `{status: "success"|"error"}`

### POST `/reset_table`
Reset to default structure (Date, Variable 1, Variable 2).

**Response:** `{status: "success"|"error"}`

## File Import Routes

### POST `/import_datafile`
Import CSV or Excel file.

**Request:** Multipart form data with file

**Formats:** .csv, .xlsx, .xls

**Response:** `{success: bool, message: string, data?: Array}`

## Statistical Analysis Routes

### POST `/calculate_correlation`
Calculate correlation between two plotted variables.

**Request:** `{xAxis: string, yAxis: string, xValues: number[], yValues: number[]}`

**Response:** `{correlation: number, p_value: number, interpretation: string}`

### POST `/api/correlations/calculate`
Calculate all pairwise correlations.

**Response:** `{success: bool}`

### GET `/api/correlations`
Get calculated correlations.

**Query:** `?limit=N` (optional)

**Response:** `{correlations: Array}`

## Chat Interface Routes

### POST `/api/chat/initialize`
Initialize chat session with API key.

**Request:** `{api_key: string}`

**Response:** `{success: bool, session_id: number}`

### POST `/api/chat/message`
Send message to AI and get response.

**Request:** `{message: string, correlations?: Array}`

**Response:** `{response: string, correlations_used: bool}`

### GET `/api/chat/history`
Get chat conversation history.

**Response:** `{messages: Array<{role, content, timestamp}>}`

### POST `/api/chat/clear`
Clear chat history.

**Request:** `{session_id: number}`

**Response:** `{success: bool}`

## Error Responses

**Format:** `{error: string, status?: string, message?: string}`

**Status Codes:**
- 200: Success
- 400: Bad request
- 401: Not authenticated
- 404: Not found
- 500: Server error

## Security

- All data routes require authentication
- User ID used to filter all queries
- API keys hashed before storage
- Input validation on all endpoints
- CORS: Same-origin policy

## SvelteKit Migration

**Replace with:**
- SvelteKit API routes (+server.ts files)
- File-based routing
- TypeScript throughout
- Form actions for mutations
- Better type safety

**Structure:**
```
routes/
  api/
    data/+server.ts
    correlations/+server.ts
    chat/+server.ts
```

**Benefits:**
- Simpler routing
- Better DX
- Type-safe request/response
- Built-in form handling
