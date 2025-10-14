# Frontend Architecture and Components

## Overview

The frontend is built with TypeScript, compiled to vanilla JavaScript, and uses DOM manipulation for interactivity. No framework is used - just TypeScript + Plotly.js for visualization.

## Technology Stack

- **Language**: TypeScript 5.3.3
- **Build**: TypeScript compiler (tsc)
- **Templating**: Jinja2 (server-side rendering)
- **Styling**: CSS3 with CSS Custom Properties
- **Visualization**: Plotly.js 3.0.1
- **HTTP**: Fetch API
- **Type Safety**: Full TypeScript types for data structures

## File Structure

```
static/
├── app.ts              # Main TypeScript application
├── app_styles.css      # All styling and design system
├── epsilon.png         # Logo/icon
└── dist/
    └── app.js          # Compiled JavaScript

templates/
├── index.html          # Main application template
├── login.html          # OAuth login page
└── page_not_found.html # 404 error page
```

## Core TypeScript Architecture

### Type Definitions

```typescript
interface RowData {
    Date: string;
    [key: string]: string | number;  // Dynamic columns
}
```

### Global State Management

```typescript
// Data state
let tableData: RowData[] = [];           // All user data
let columnCounter: number = 0;           // For generating column names

// Chat state
let chatSessionId: number | null = null; // Current chat session
let lastCorrelations: any[] = [];        // Last calculated correlations
let isChatOpen: boolean = false;         // Chat panel visibility

// Configuration
const baseUrl = getBaseUrl();            // Handles /epsilon/ prefix
```

**State Management Pattern:**
- Global mutable state (no framework state management)
- DOM is source of truth for input values
- Server data fetched and stored in `tableData`
- UI updated imperatively after state changes

### Application Initialization

```typescript
document.addEventListener('DOMContentLoaded', async () => {
    // 1. Check authentication
    await displayUserName();
    
    // 2. Load data from server
    const response = await fetch(baseUrl + 'get_data');
    const data = await response.json();
    tableData = data;
    
    // 3. Initialize UI
    updateTableHeaders();
    updateInputRow();
    renderTableRows();
    updateDropdownSelectors();
    updatePlot();
    
    // 4. Setup event listeners
    setupColumnTitleListeners();
    setupDropZone();
    
    // 5. Initialize chat
    initializeChatInterface();
});
```

## Component Breakdown

### 1. Data Table Component

**DOM Structure:**
```html
<table id="dataTable">
  <thead>
    <tr>
      <th contenteditable="false">Date</th>
      <th contenteditable="true">Variable 1</th>
      <th contenteditable="true">Variable 2</th>
    </tr>
  </thead>
  <tbody>
    <!-- Input row -->
    <tr class="input-row">
      <td><input type="date" id="Date" value="2024-10-14"></td>
      <td><input type="number" id="Variable_1"></td>
      <td><input type="number" id="Variable_2"></td>
    </tr>
    <!-- Data rows (dynamically rendered) -->
  </tbody>
</table>
```

**Key Functions:**

```typescript
function addRow(): void
    // Collect values from input row
    // POST to /add_row
    // Update local state
    // Re-render table
    
function renderTableRows(): void
    // Clear existing rows
    // Create row for each data point
    // Add edit/delete buttons
    // Append to tbody
    
function deleteRow(index: number): void
    // Remove from tableData
    // POST to /replace_data
    // Re-render table
    
function updateTableHeaders(): void
    // Read column structure from data
    // Create <th> elements
    // Setup contenteditable listeners
```

**Features:**
- Editable column headers (double-click to rename)
- Dynamic row addition/deletion
- Input validation (dates, numbers)
- Real-time updates to server

---

### 2. Plot Visualization Component

**DOM Structure:**
```html
<div id="plot"></div>
<div class="plot-controls">
  <select id="xAxis"><!-- options --></select>
  <select id="yAxis1"><!-- options --></select>
  <select id="yAxis2"><!-- options --></select>
</div>
```

**Key Functions:**

```typescript
function updatePlot(): void
    // Get selected axes from dropdowns
    // Extract data from tableData
    // Create Plotly traces
    // Render with Plotly.newPlot()
    
function updateDropdownSelectors(): void
    // Populate axis selectors with column names
    // Exclude Date from Y-axis options
```

**Plotly Configuration:**
```typescript
const trace1 = {
    x: dates,
    y: values1,
    type: 'scatter',
    mode: 'lines+markers',
    name: yAxis1,
    yaxis: 'y'
};

const trace2 = {
    x: dates,
    y: values2,
    type: 'scatter',
    mode: 'lines+markers',
    name: yAxis2,
    yaxis: 'y2'
};

const layout = {
    title: 'Data Visualization',
    xaxis: { title: xAxis },
    yaxis: { title: yAxis1 },
    yaxis2: {
        title: yAxis2,
        overlaying: 'y',
        side: 'right'
    }
};

Plotly.newPlot('plot', [trace1, trace2], layout);
```

**Features:**
- Dual Y-axis support
- Interactive hover tooltips
- Automatic updates on data changes
- Responsive layout

---

### 3. CSV Import Component

**DOM Structure:**
```html
<div id="dropZone" class="drop-zone">
  Drag and drop CSV file here
</div>
```

**Key Functions:**

```typescript
function setupDropZone(): void
    // Add dragover event (prevent default)
    // Add drop event handler
    // Show visual feedback on hover
    
async function handleFileUpload(file: File): Promise<void>
    // Create FormData with file
    // POST to /import_datafile
    // Update tableData with response
    // Re-render all UI components
```

**Features:**
- Drag-and-drop file upload
- Visual feedback on hover
- Automatic data replacement
- Error handling and user feedback

---

### 4. Correlation Analysis Component

**DOM Structure:**
```html
<div id="correlationResults"></div>
<button onclick="calculateCorrelation()">Calculate Plotted Correlations</button>
<button onclick="calculateAllCorrelations()">Calculate All Correlations</button>
```

**Key Functions:**

```typescript
async function calculateCorrelation(): Promise<void>
    // Get current plot selections
    // Extract x and y values
    // POST to /calculate_correlation
    // Display interpretation
    
async function calculateAllCorrelations(): Promise<void>
    // POST to /api/correlations/calculate
    // GET from /api/correlations
    // Render correlation matrix with heatmap
```

**Correlation Matrix Rendering:**
```typescript
function renderCorrelationMatrix(correlations): void
    // Create HTML table
    // Apply color coding (red = negative, green = positive)
    // Add significance indicators (*)
    // Display strength classifications
```

**Color Scheme:**
- Strong positive (r > 0.7): Dark green
- Moderate positive (0.3 < r < 0.7): Light green
- Weak/No correlation (-0.3 < r < 0.3): White/gray
- Moderate negative (-0.7 < r < -0.3): Light red
- Strong negative (r < -0.7): Dark red

---

### 5. Chat Interface Component

**DOM Structure:**
```html
<div id="chatContainer" class="chat-container">
  <button id="chatToggle" class="chat-toggle">💬 Chat with EpsilonAI</button>
  
  <div id="chatPanel" class="chat-panel">
    <!-- API Key Section (shown first) -->
    <div id="apiKeySection">
      <input type="password" id="apiKeyInput">
      <button id="initializeChatBtn">Initialize Chat</button>
    </div>
    
    <!-- Chat Messages -->
    <div id="chatMessages"></div>
    
    <!-- Correlation Context -->
    <div id="correlationContext">
      <h4>Context for AI:</h4>
      <ul id="correlationList"></ul>
    </div>
    
    <!-- Input -->
    <div id="chatInput">
      <input type="text" id="messageInput">
      <button id="sendMessageBtn">Send</button>
    </div>
    
    <!-- Controls -->
    <div id="chatControls">
      <button id="clearChatBtn">Clear Chat</button>
    </div>
  </div>
</div>
```

**Key Functions:**

```typescript
function initializeChatInterface(): void
    // Setup button click handlers
    // Load chat history if session exists
    // Initialize disclaimer modal
    
async function initializeChat(apiKey: string): Promise<void>
    // POST to /api/chat/initialize
    // Store session ID
    // Show chat interface
    // Load history
    
async function sendChatMessage(message: string): Promise<void>
    // Add user message to UI
    // POST to /api/chat/message with correlations context
    // Add assistant response to UI
    // Update correlation indicator
    
function addMessageToChat(role: 'user' | 'assistant', content: string): void
    // Create message div
    // Apply role-based styling
    // Append to chatMessages
    // Auto-scroll to bottom
    
async function loadChatHistory(): Promise<void>
    // GET from /api/chat/history
    // Render all messages
```

**Chat Panel States:**
1. **Closed**: Only toggle button visible
2. **API Key Entry**: Panel open, requesting key
3. **Active Chat**: Full interface with messages and input

**Correlation Context:**
- Displays top 3 correlations
- Updated when correlations calculated
- Sent to OpenAI for context
- Visual indicator on toggle button

---

### 6. Authentication Component

**Login Page (login.html):**
```html
<div class="login-container">
  <h1>Data Plotter</h1>
  <p>Sign in with Google to continue</p>
  <div id="g_id_onload" 
       data-client_id="{{ google_client_id }}"
       data-callback="handleCredentialResponse">
  </div>
</div>
```

**JavaScript Integration:**
```typescript
async function handleCredentialResponse(response) {
    const token = response.credential;
    
    // Verify with backend
    const result = await fetch('/verify-google-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token })
    });
    
    if (result.ok) {
        window.location.href = '/';  // Redirect to main app
    }
}

async function handleLogout() {
    await fetch('/logout', { method: 'POST' });
    window.location.href = '/login';
}
```

---

## Event Handling Patterns

### 1. Direct onclick Handlers (HTML)
```html
<button onclick="addRow()">Add Row</button>
<button onclick="clearAllData()">Clear All Data</button>
```

**Usage:** Simple button clicks, global function access

---

### 2. addEventListener (TypeScript)
```typescript
document.getElementById('xAxis')?.addEventListener('change', updatePlot);
document.getElementById('sendMessageBtn')?.addEventListener('click', sendMessage);
```

**Usage:** Dynamic elements, need event object access

---

### 3. Event Delegation
```typescript
document.getElementById('dataTable')?.addEventListener('click', (e) => {
    if (e.target.classList.contains('delete-button')) {
        const index = e.target.dataset.index;
        deleteRow(index);
    }
});
```

**Usage:** Dynamic row buttons, efficient for many elements

---

## HTTP Request Patterns

All requests use Fetch API with async/await:

```typescript
// GET request
async function getData() {
    const response = await fetch(baseUrl + 'get_data');
    const data = await response.json();
    return data;
}

// POST request with JSON body
async function addRow(rowData) {
    const response = await fetch(baseUrl + 'add_row', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(rowData)
    });
    const result = await response.json();
    return result;
}

// POST request with file upload
async function uploadFile(file) {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await fetch(baseUrl + 'import_datafile', {
        method: 'POST',
        body: formData  // No Content-Type header (auto-set)
    });
    return await response.json();
}
```

**Error Handling:**
```typescript
try {
    const response = await fetch(url, options);
    if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
    }
    const data = await response.json();
    // Handle success
} catch (error) {
    console.error('Request failed:', error);
    alert('Error: ' + error.message);
}
```

---

## State Synchronization Flow

```
User Action (UI)
    ↓
JavaScript Handler
    ↓
Update Local State (optional)
    ↓
HTTP Request to Server
    ↓
Server Updates Database
    ↓
Server Returns JSON
    ↓
Update Local State
    ↓
Re-render Affected UI
```

**Example: Adding a Row**
1. User clicks "Add Row" button
2. `addRow()` collects input values
3. Validates data locally
4. POST to `/add_row`
5. Server saves to database
6. Server returns success
7. Add to `tableData` array
8. Re-render table rows
9. Clear input fields
10. Update plot (if needed)

---

## UI Update Patterns

### Full Re-render
```typescript
function renderTableRows() {
    const tbody = document.querySelector('#dataTable tbody');
    tbody.innerHTML = '';  // Clear all
    tableData.forEach(row => {
        const tr = createRowElement(row);
        tbody.appendChild(tr);
    });
}
```
**Used for:** Table data, correlation matrix

### Incremental Update
```typescript
function addMessageToChat(role, content) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${role}`;
    messageDiv.textContent = content;
    chatMessages.appendChild(messageDiv);
}
```
**Used for:** Chat messages, notifications

### Property Update
```typescript
function updatePlot() {
    // Plotly intelligently diffs and updates
    Plotly.newPlot('plot', traces, layout);
}
```
**Used for:** Plotly charts (handles diffing internally)

---

## Migration to SvelteKit

### Component Mapping

| Current (Vanilla TS) | SvelteKit Equivalent |
|---------------------|----------------------|
| `renderTableRows()` | `<DataTable bind:data={tableData}>` |
| `updatePlot()` | `<PlotVisualization {xAxis} {yAxis1} {yAxis2}>` |
| `addMessageToChat()` | `<ChatMessage {role} {content}>` |
| `setupDropZone()` | `<FileDropZone on:upload={handleUpload}>` |
| Global state variables | Svelte stores (`$tableData`) |

### Advantages of SvelteKit

1. **Reactivity**: No manual DOM updates
   ```svelte
   <script>
     let tableData = [];
     $: console.log('Data changed:', tableData);
   </script>
   ```

2. **Component Reusability**: Break into small components
   ```svelte
   <Table>
     {#each rows as row}
       <TableRow data={row} on:delete={handleDelete} />
     {/each}
   </Table>
   ```

3. **Type Safety**: Full TypeScript + Svelte integration
   ```svelte
   <script lang="ts">
     export let data: RowData[];
   </script>
   ```

4. **Server Components**: Combine SSR + client-side
   ```svelte
   <!-- +page.server.ts -->
   export async function load({ locals }) {
     const data = await db.query(locals.user.id);
     return { data };
   }
   ```

5. **State Management**: Built-in stores
   ```typescript
   // stores.ts
   export const tableData = writable<RowData[]>([]);
   export const chatSession = writable<number | null>(null);
   ```

### Migration Strategy

1. **Phase 1**: Convert TypeScript to Svelte components (keep Flask backend)
2. **Phase 2**: Replace Flask routes with SvelteKit server routes
3. **Phase 3**: Migrate database from SQLAlchemy to Prisma
4. **Phase 4**: Add SvelteKit-specific features (SSR, streaming, etc.)

See `09-SVELTEKIT-MIGRATION.md` for detailed guide.
