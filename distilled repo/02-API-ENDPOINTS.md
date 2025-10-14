# API Endpoints and Routes

## Overview

The Flask application exposes RESTful JSON APIs for all data operations. Routes support both root path (`/`) and subdirectory deployment (`/epsilon/`) for production.

## Route Naming Convention

- Most routes have dual registrations:
  ```python
  @app.route('/endpoint')
  @app.route('/epsilon/endpoint')
  ```
- This supports deployment at `dylanshah.com/epsilon/` in production

## Authentication Routes

### GET `/auth-status`

Check if user is authenticated.

**Response:**
```json
{
  "authenticated": true,
  "email": "user@example.com"
}
```
or
```json
{
  "authenticated": false
}
```

**Used by:** Initial page load, session verification

---

### POST `/verify-google-token`

Verify Google OAuth token and create session.

**Request Body:**
```json
{
  "token": "google_oauth_token_string"
}
```

**Response (Success):**
```json
{
  "success": true,
  "user": {
    "id": "google_user_id",
    "email": "user@example.com"
  }
}
```

**Response (Error):**
```json
{
  "success": false,
  "error": "Invalid token"
}
```

**Process:**
1. Verify token with Google's token verification endpoint
2. Extract user ID and email from token claims
3. Create or update user in database
4. Create Flask-Login session
5. Store email in session storage

---

### POST `/logout`

Log out current user and clear session.

**Response:**
```json
{
  "success": true
}
```

**Process:**
1. Call Flask-Login `logout_user()`
2. Clear server-side session data
3. Invalidate authentication cookies

---

### GET `/login`

Render Google OAuth login page.

**Returns:** HTML template with Google Sign-In button

**Template Variables:**
- `google_client_id`: OAuth client ID for Google Sign-In SDK

---

## Main Application Routes

### GET `/`

Render main application page (requires authentication).

**Returns:** HTML template with embedded data

**Template Variables:**
- `today_date`: Today's date in YYYY-MM-DD format
- `authenticated`: Boolean authentication status

**Redirect:** Redirects to `/login` if not authenticated

---

## Data Management Routes

### POST `/add_row`

Add a single data point to the table.

**Request Body:**
```json
{
  "Date": "2024-10-14",
  "Variable_1": 42.5,
  "Variable_2": 38.2
}
```

**Response:**
```json
{
  "status": "success"
}
```

**Process:**
1. Validate user authentication
2. Parse and validate date field
3. Store data point in database
4. Trigger correlation recalculation (async)

---

### GET `/get_data`

Retrieve all data points for current user.

**Response:**
```json
[
  {
    "Date": "2024-10-13",
    "Variable_1": 40.0,
    "Variable_2": 35.5
  },
  {
    "Date": "2024-10-14",
    "Variable_1": 42.5,
    "Variable_2": 38.2
  }
]
```

**Notes:**
- Returns empty array if no data
- Data ordered by date ascending
- Column structure determined by stored data

---

### POST `/replace_data`

Replace all user data (used for bulk updates).

**Request Body:**
```json
{
  "data": [
    {"Date": "2024-10-13", "Variable_1": 40.0},
    {"Date": "2024-10-14", "Variable_1": 42.5}
  ]
}
```

**Response:**
```json
{
  "status": "success"
}
```

**Process:**
1. Delete all existing data for user
2. Insert new data points
3. Recalculate correlations

---

### POST `/clear_data`

Delete all data points for current user.

**Request Body:** None

**Response:**
```json
{
  "status": "success"
}
```

---

### POST `/reset_table`

Reset table to default structure (clear data, reset columns).

**Request Body:** None

**Response:**
```json
{
  "status": "success"
}
```

**Difference from `/clear_data`:**
- `/clear_data`: Deletes data, keeps column structure
- `/reset_table`: Deletes data AND resets to default columns (Date, Variable 1, Variable 2)

---

## File Import Routes

### POST `/import_datafile`

Import data from CSV or Excel file.

**Request:** Multipart form data with file upload

**Supported Formats:**
- `.csv` - Comma-separated values
- `.xlsx` - Excel 2007+
- `.xls` - Excel 97-2003

**File Requirements:**
- First column must contain valid dates
- Subsequent columns can be numeric data
- Column names taken from file headers

**Response (Success):**
```json
{
  "success": true,
  "message": "Successfully imported 50 rows",
  "data": [/* imported data array */]
}
```

**Response (Error):**
```json
{
  "error": "First column must contain valid dates"
}
```

**Process:**
1. Validate file format
2. Parse with pandas (CSV/Excel)
3. Convert first column to datetime
4. Extract numeric values from other columns
5. Replace user's existing data
6. Recalculate correlations

---

## Statistical Analysis Routes

### POST `/calculate_correlation`

Calculate correlation between two variables from plotted data.

**Request Body:**
```json
{
  "xAxis": "Variable_1",
  "yAxis": "Variable_2",
  "xValues": [40.0, 42.5, 45.0],
  "yValues": [35.5, 38.2, 40.0]
}
```

**Response:**
```json
{
  "correlation": 0.987,
  "p_value": 0.001,
  "interpretation": "There is a strong positive correlation between Variable_1 and Variable_2 (correlation = 0.987). This is statistically significant (p = 0.001).",
  "debug_info": []
}
```

**Special Cases:**
- Supports date correlations (Date vs numeric variable)
- Converts dates to timestamps for calculation
- Handles missing/NaN values by filtering

**Error Responses:**
```json
{
  "error": "Need at least 2 numeric data points for correlation",
  "debug_info": ["details here"]
}
```

---

### POST `/api/correlations/calculate`

Trigger calculation of all pairwise correlations for user's data.

**Request Body:** None

**Response:**
```json
{
  "success": true,
  "message": "Correlations calculated successfully"
}
```

**Process:**
1. Load all user data
2. Convert to pandas DataFrame
3. Calculate Pearson correlation for all numeric column pairs
4. Store results in `correlation_results` table
5. Used to populate correlation matrix UI

---

### GET `/api/correlations`

Retrieve all calculated correlations for current user.

**Query Parameters:**
- `limit` (optional): Maximum number of results

**Response:**
```json
{
  "correlations": [
    {
      "variable1": "Variable_1",
      "variable2": "Variable_2",
      "correlation": 0.857,
      "p_value": 0.001,
      "strength": "strong",
      "direction": "positive",
      "calculated_at": "2024-10-14T10:30:00Z"
    }
  ]
}
```

---

## Chat Interface Routes

### POST `/api/chat/initialize`

Initialize chat session with OpenAI API key.

**Request Body:**
```json
{
  "api_key": "sk-..."
}
```

**Response:**
```json
{
  "success": true,
  "session_id": 123
}
```

**Process:**
1. Hash API key (SHA-256)
2. Create or update chat session
3. Store hashed key in database
4. Return session ID for subsequent requests

---

### POST `/api/chat/message`

Send message to chat assistant and get response.

**Request Body:**
```json
{
  "message": "What does my data show?",
  "correlations": [/* optional correlation context */]
}
```

**Response:**
```json
{
  "response": "Based on your data, I can see a strong positive correlation between Variable_1 and Variable_2...",
  "correlations_used": true
}
```

**Process:**
1. Retrieve chat session and API key hash
2. Load conversation history
3. Build context with user data and correlations
4. Call OpenAI API with GPT-4/3.5
5. Store message and response in database
6. Return AI response

---

### GET `/api/chat/history`

Retrieve chat conversation history for current session.

**Response:**
```json
{
  "messages": [
    {
      "role": "user",
      "content": "What does my data show?",
      "timestamp": "2024-10-14T10:30:00Z"
    },
    {
      "role": "assistant",
      "content": "Based on your data...",
      "timestamp": "2024-10-14T10:30:05Z"
    }
  ]
}
```

---

### POST `/api/chat/clear`

Clear chat history for current session.

**Request Body:**
```json
{
  "session_id": 123
}
```

**Response:**
```json
{
  "success": true
}
```

**Process:**
1. Delete all messages for session
2. Keep session metadata (API key, etc.)

---

## Error Handling Patterns

### HTTP Status Codes

- `200 OK` - Successful request
- `400 Bad Request` - Invalid input data
- `401 Unauthorized` - Not authenticated
- `404 Not Found` - Route doesn't exist
- `500 Internal Server Error` - Server error

### Error Response Format

```json
{
  "error": "Human-readable error message",
  "status": "error",
  "message": "Additional details"
}
```

## Rate Limiting & Security

**Current Implementation:**
- No rate limiting (relies on Google OAuth throttling)
- Session-based auth prevents CSRF for same-origin
- API key hashing prevents plaintext exposure

**SvelteKit Recommendations:**
- Implement rate limiting per user/IP
- Add request validation middleware
- Use JWTs for stateless auth
- Add CORS configuration
- Implement API versioning (/api/v1/...)

## API Design Patterns

### Consistency
- All data mutations return `{"status": "success"}` or error object
- All GET endpoints return JSON data directly or in wrapper object
- Authentication checked via `@login_required` or manual checks

### RESTful Principles
- Uses HTTP methods semantically (GET/POST)
- Resource-based URLs (`/api/chat/...`, `/api/correlations/...`)
- JSON request/response bodies
- Appropriate HTTP status codes

### Future API Improvements
1. **Pagination**: Add offset/limit to `/get_data`
2. **Filtering**: Support date ranges, column selection
3. **Bulk Operations**: Batch add/update/delete
4. **WebSockets**: Real-time updates for collaboration
5. **GraphQL**: Consider for complex queries
