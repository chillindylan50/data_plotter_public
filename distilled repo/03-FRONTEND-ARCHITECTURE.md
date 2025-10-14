# Frontend Architecture

## Overview

Frontend built with TypeScript, compiled to vanilla JavaScript, using DOM manipulation. No framework - just TypeScript + Plotly.js.

## Technology Stack

- **Language**: TypeScript 5.3.3
- **Build**: TypeScript compiler (tsc)
- **Templating**: Jinja2 (server-side)
- **Styling**: CSS3 with custom properties
- **Visualization**: Plotly.js 3.0.1
- **HTTP**: Fetch API

## State Management

**Global State:**
- `tableData[]` - All user data
- `column Counter` - For generating names
- `chatSessionId` - Current chat session
- `isChatOpen` - Chat panel visibility

**Pattern:**
- Global mutable state
- DOM is source of truth for inputs
- Server data fetched and stored
- UI updated imperatively

## Core Components

**1. Data Table:**
- Editable column headers
- Input row for new data
- Dynamic rows with delete buttons
- Real-time validation

**2. Plot Visualization:**
- Plotly chart container
- Axis selector dropdowns
- Auto-updates on data changes

**3. CSV Import:**
- Drag-and-drop zone
- File upload handling
- Visual feedback

**4. Correlation Matrix:**
- Color-coded heatmap
- Significance indicators
- Interactive cells

**5. Chat Interface:**
- Toggle button
- API key input
- Message display
- Context indicator

**6. Authentication:**
- Google Sign-In button
- User email display
- Sign out button

## Event Handling

**Patterns:**
1. Direct onclick (HTML attributes)
2. addEventListener (TypeScript)
3. Event delegation (table rows)

**Flow:**
```
User Action → Handler Function
    ↓
Update Local State
    ↓
API Request
    ↓
Update UI
```

## HTTP Requests

**All requests use Fetch API:**
- GET for retrieving data
- POST for mutations
- JSON request/response
- Error handling with try/catch

## Application Initialization

**On DOM Load:**
1. Check authentication
2. Load data from server
3. Initialize table headers
4. Render data rows
5. Update dropdowns
6. Render plot
7. Initialize chat

## SvelteKit Migration

**Component Mapping:**

| Current | SvelteKit |
|---------|-----------|
| renderTableRows() | DataTable.svelte |
| updatePlot() | PlotVisualization.svelte |
| addMessageToChat() | ChatMessage.svelte |
| setupDropZone() | FileDropZone.svelte |
| Global state | Svelte stores |

**Advantages:**
- **Reactivity**: No manual DOM updates
- **Components**: Reusable, isolated
- **Type Safety**: Full TypeScript integration
- **State**: Built-in stores
- **Lifecycle**: Automatic cleanup

**Migration Strategy:**
1. Convert functions to Svelte components
2. Replace global state with stores
3. Use reactive declarations ($:)
4. Leverage Svelte's reactivity
5. Remove manual DOM manipulation
