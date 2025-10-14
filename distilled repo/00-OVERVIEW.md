# Data Plotter - High-Level Design Overview

## Application Summary

Data Plotter is a web-based data visualization and statistical analysis tool that allows users to:
- Enter and manage time-series data with dynamic columns
- Import data from CSV/Excel files
- Visualize data using interactive Plotly charts
- Calculate and analyze correlations between variables
- Chat with an AI assistant (EpsilonAI) about their data using OpenAI

## Current Technology Stack

### Backend
- **Framework**: Flask 3.1.1 (Python web framework)
- **Database**: SQLite via SQLAlchemy 2.0.35 ORM
- **Authentication**: Google OAuth 2.0 via Flask-Login
- **Statistical Analysis**: SciPy 1.16.0 for correlation calculations
- **Data Processing**: Pandas 2.2.3, NumPy 2.3.2
- **AI Integration**: OpenAI API 1.51.2 for chat functionality

### Frontend
- **Language**: TypeScript 5.3.3 (compiled to JavaScript)
- **Templating**: Jinja2 (Flask templates)
- **Visualization**: Plotly.js 3.0.1
- **Styling**: CSS3 with CSS variables design system
- **Build Tool**: TypeScript compiler (tsc)

### Architecture Pattern
- **Type**: Traditional server-rendered MPA (Multi-Page Application) with AJAX
- **Data Flow**: Client → Flask Routes → Database → Client (JSON responses)
- **Session Management**: Server-side sessions via Flask-Login
- **File Structure**: Monolithic Flask app with separate static/templates folders

## Core Features

### 1. User Authentication & Management
- Google OAuth 2.0 login
- Per-user data isolation
- Session-based authentication
- Multi-user support with separate data spaces

### 2. Data Management
- Interactive data table with editable cells
- Date-based time series (first column always Date)
- Dynamic column addition/removal
- CSV/Excel file import via drag-and-drop
- Real-time data validation
- Per-user data persistence in SQLite database

### 3. Data Visualization
- Interactive Plotly line charts
- Dual Y-axis support (Y1 and Y2)
- Flexible axis selection via dropdowns
- Automatic plot updates on data changes
- Hover tooltips for data points

### 4. Statistical Analysis
- Pairwise correlation calculation (Pearson's r)
- Full correlation matrix computation
- Statistical significance testing (p-values)
- Correlation strength classification (weak/moderate/strong)
- Date-variable correlation support
- Cached correlation results in database

### 5. AI Chat Assistant (EpsilonAI)
- OpenAI GPT integration for data insights
- Context-aware conversations about user's data
- Correlation results passed as context
- Chat history persistence per user
- API key management (hashed storage)
- Medical disclaimer for health-related data

## Key Design Principles

1. **User-Centric**: Each user has isolated data and chat sessions
2. **Real-Time**: Immediate UI updates on data changes
3. **Stateful**: Server maintains session state and database persistence
4. **Progressive Enhancement**: Core functionality works, chat is optional
5. **Responsive Design**: CSS Grid and Flexbox for responsive layouts
6. **Type Safety**: TypeScript for frontend type checking

## Data Flow Architecture

```
User Input → TypeScript Client
    ↓
HTTP Request (fetch API)
    ↓
Flask Route Handler
    ↓
Database Service Layer (database.py)
    ↓
SQLAlchemy ORM
    ↓
SQLite Database
    ↓
JSON Response → Client
    ↓
DOM Update (TypeScript)
```

## File Organization

```
app.py                 - Main Flask application and route handlers
models.py              - SQLAlchemy database models
database.py            - Database service layer (CRUD operations)
static/
  ├── app.ts          - TypeScript client-side application
  ├── app_styles.css  - CSS styling and design system
  └── dist/           - Compiled JavaScript
templates/
  ├── index.html      - Main application page
  ├── login.html      - Google OAuth login page
  └── page_not_found.html
instance/
  └── user_data.db    - SQLite database file
```

## Security Considerations

1. **Authentication**: Google OAuth ensures secure identity verification
2. **Session Management**: Flask-Login with secure session cookies
3. **Data Isolation**: User ID foreign keys ensure data privacy
4. **API Key Security**: OpenAI keys hashed before storage (SHA-256)
5. **Input Validation**: Type checking and data sanitization
6. **CORS**: Same-origin policy for API requests

## Scalability Considerations

**Current Limitations:**
- SQLite is single-file (not ideal for high concurrency)
- Server-side sessions require sticky sessions in load balancing
- Synchronous request handling (no async/await in Flask routes)
- Static file serving through Flask (not optimized for production)

**Future Considerations for SvelteKit:**
- Move to PostgreSQL/MySQL for better concurrency
- JWT tokens for stateless authentication
- Server-sent events or WebSockets for real-time updates
- CDN for static assets
- Horizontal scaling with stateless architecture

## Migration Path to SvelteKit

The application is well-suited for SvelteKit migration because:

1. **API-First**: Backend already uses JSON APIs (can become REST/GraphQL API)
2. **Type Safety**: TypeScript codebase can be adapted to Svelte with TypeScript
3. **Component Structure**: Current monolithic frontend can be split into Svelte components
4. **SSR Compatibility**: SvelteKit's SSR can replace Flask template rendering
5. **Database Layer**: SQLAlchemy models can be replaced with Prisma/Drizzle ORM
6. **Auth**: Can migrate to SvelteKit auth with OAuth adapter

See detailed migration guide in `09-SVELTEKIT-MIGRATION.md`
