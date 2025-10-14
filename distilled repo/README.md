# Data Plotter - Distilled Design Documentation

This folder contains comprehensive high-level design documentation for the Data Plotter application, intended to guide a re-implementation in SvelteKit.

## 📋 Document Index

### Core Architecture

1. **[00-OVERVIEW.md](./00-OVERVIEW.md)**
   - Application summary and features
   - Current technology stack
   - Architecture patterns
   - Key design principles
   - Data flow overview

2. **[01-DATABASE-SCHEMA.md](./01-DATABASE-SCHEMA.md)**
   - Entity relationship diagram
   - Complete schema definitions
   - Table structures and relationships
   - Database operations and service layer
   - Migration guide for Prisma

3. **[02-API-ENDPOINTS.md](./02-API-ENDPOINTS.md)**
   - Complete API reference
   - Request/response formats
   - Authentication routes
   - Data management endpoints
   - Statistical analysis APIs
   - Chat interface routes

### Frontend Architecture

4. **[03-FRONTEND-ARCHITECTURE.md](./03-FRONTEND-ARCHITECTURE.md)**
   - TypeScript component structure
   - State management patterns
   - Event handling
   - HTTP request patterns
   - Component breakdown
   - Migration mapping to Svelte

5. **[04-DESIGN-SYSTEM.md](./04-DESIGN-SYSTEM.md)**
   - CSS design tokens and variables
   - Color palette and typography
   - Component styles
   - Responsive design patterns
   - Accessibility considerations
   - Dark mode preparation

### Core Features

6. **[05-AUTHENTICATION.md](./05-AUTHENTICATION.md)**
   - Google OAuth 2.0 flow
   - Session management
   - Security considerations
   - Token verification
   - User isolation
   - Migration to Auth.js

7. **[06-PLOTLY-VISUALIZATION.md](./06-PLOTLY-VISUALIZATION.md)**
   - Plotly.js integration
   - Chart types and configurations
   - Interactive features
   - Responsive design
   - Performance optimization
   - Svelte component patterns

8. **[07-CORRELATION-ANALYSIS.md](./07-CORRELATION-ANALYSIS.md)**
   - Statistical analysis fundamentals
   - Pearson correlation calculation
   - Natural language interpretation
   - Correlation matrix visualization
   - Caching strategies
   - Chat context integration

9. **[08-CHAT-INTEGRATION.md](./08-CHAT-INTEGRATION.md)**
   - OpenAI API integration
   - Chat session management
   - Context building
   - Message flow
   - API key security
   - Text sanitization
   - Medical disclaimer

### Migration Guide

10. **[09-SVELTEKIT-MIGRATION.md](./09-SVELTEKIT-MIGRATION.md)**
    - Complete migration strategy
    - Technology stack mapping
    - Step-by-step migration guide
    - Database migration with Prisma
    - Component conversion examples
    - Deployment strategies
    - Migration checklist

## 🎯 Purpose

This documentation distills the high-level architecture and design decisions from the current Flask + TypeScript implementation to enable:

1. **Understanding**: Comprehensive overview of how the application works
2. **Re-implementation**: Guide for building the application in SvelteKit
3. **Decision Making**: Rationale behind architectural choices
4. **Best Practices**: Patterns and approaches that work well

## 📊 Current Application Overview

**What it does:**
- Personal data tracking and visualization
- Interactive time-series data table
- Plotly.js charts with dual Y-axes
- Statistical correlation analysis
- AI chat assistant for data insights (EpsilonAI)

**Current Stack:**
- **Backend**: Flask 3.1.1 (Python)
- **Frontend**: TypeScript 5.3.3 (vanilla)
- **Database**: SQLite + SQLAlchemy
- **Auth**: Google OAuth 2.0
- **Visualization**: Plotly.js 3.0.1
- **AI**: OpenAI API

**Production URL**: https://dylanshah.com/epsilon

## 🚀 Migration Path

The recommended approach is to migrate to:

- **Framework**: SvelteKit 2.0+
- **Database**: PostgreSQL + Prisma
- **Auth**: Auth.js (NextAuth) with Google provider
- **Language**: Full-stack TypeScript
- **Deployment**: Vercel/Cloudflare Pages

See **[09-SVELTEKIT-MIGRATION.md](./09-SVELTEKIT-MIGRATION.md)** for detailed migration guide.

## 📖 How to Use This Documentation

### For Understanding the Current System

1. Start with **00-OVERVIEW.md** for the big picture
2. Review **01-DATABASE-SCHEMA.md** for data structures
3. Read **02-API-ENDPOINTS.md** for backend functionality
4. Explore **03-FRONTEND-ARCHITECTURE.md** for UI patterns

### For Re-implementation in SvelteKit

1. Read **09-SVELTEKIT-MIGRATION.md** first (migration strategy)
2. Reference specific feature docs as you implement:
   - Auth: **05-AUTHENTICATION.md**
   - Data viz: **06-PLOTLY-VISUALIZATION.md**
   - Stats: **07-CORRELATION-ANALYSIS.md**
   - Chat: **08-CHAT-INTEGRATION.md**
3. Use **04-DESIGN-SYSTEM.md** for styling
4. Follow the migration checklist

### For Specific Features

| Feature | Document |
|---------|----------|
| User login/logout | 05-AUTHENTICATION.md |
| Data table CRUD | 02-API-ENDPOINTS.md, 03-FRONTEND-ARCHITECTURE.md |
| Chart visualization | 06-PLOTLY-VISUALIZATION.md |
| Correlation calculation | 07-CORRELATION-ANALYSIS.md |
| AI chat | 08-CHAT-INTEGRATION.md |
| Database design | 01-DATABASE-SCHEMA.md |
| API design | 02-API-ENDPOINTS.md |
| CSS styling | 04-DESIGN-SYSTEM.md |

## 🏗️ Key Architectural Patterns

### Current Architecture
```
Browser (TypeScript)
    ↓ AJAX (fetch)
Flask Routes (Python)
    ↓
SQLAlchemy ORM
    ↓
SQLite Database
```

### Target Architecture (SvelteKit)
```
Browser (Svelte Components)
    ↓ Automatic reactivity
SvelteKit Server Routes (TypeScript)
    ↓
Prisma ORM
    ↓
PostgreSQL Database
```

## 📝 Document Conventions

### Code Examples

- **Current implementation** shown in Python (Flask) or TypeScript (vanilla)
- **Migration suggestions** shown in TypeScript (SvelteKit)
- All examples are production-ready or near-production quality

### Sections

Each document includes:
- **Overview**: What the feature does
- **Technology Stack**: Libraries and tools used
- **Implementation Details**: How it works
- **Migration Guide**: How to implement in SvelteKit

## 🔒 Security Considerations

Key security features documented:

1. **Authentication**: Google OAuth with session management
2. **Data Isolation**: User ID foreign keys ensure privacy
3. **API Key Security**: SHA-256 hashing for OpenAI keys
4. **Input Validation**: Type checking and sanitization
5. **CORS**: Same-origin policy enforcement

See **05-AUTHENTICATION.md** for detailed security documentation.

## 🎨 Design Philosophy

1. **User-Centric**: Simple, intuitive interface
2. **Real-Time**: Immediate feedback on actions
3. **Data Privacy**: Per-user isolation, no data sharing
4. **Progressive Enhancement**: Core features work, chat is optional
5. **Responsive**: Mobile-first design
6. **Accessible**: Keyboard navigation, screen reader support

See **04-DESIGN-SYSTEM.md** for design principles.

## 📊 Data Flow

### Adding a Data Point
```
User enters data → Frontend validation → POST /add_row
→ Backend validation → Database insert → Recalculate correlations
→ Return success → Update UI → Refresh plot
```

### Calculating Correlations
```
User clicks "Calculate" → POST /api/correlations/calculate
→ Load all user data → Calculate all pairs → Store in DB
→ Return success → GET /api/correlations → Display matrix
```

### Chat Message
```
User sends message → GET correlations (context)
→ POST /api/chat/message → Load chat history
→ Build OpenAI context → Call GPT API → Store messages
→ Return response → Display in chat
```

## 🧪 Testing

The current application has:
- Basic Playwright E2E tests
- Manual testing for all features

For SvelteKit migration, add:
- Vitest unit tests
- Playwright E2E tests
- Integration tests
- API route tests

See **09-SVELTEKIT-MIGRATION.md** section "Testing Strategy"

## 📚 Additional Resources

### Current Application
- **Live Demo**: https://dylanshah.com/epsilon
- **Repository**: https://github.com/chillindylan50/data_plotter_public

### Technologies
- [Flask Documentation](https://flask.palletsprojects.com/)
- [TypeScript Documentation](https://www.typescriptlang.org/)
- [Plotly.js Documentation](https://plotly.com/javascript/)
- [SQLAlchemy Documentation](https://www.sqlalchemy.org/)

### Migration Targets
- [SvelteKit Documentation](https://kit.svelte.dev/)
- [Prisma Documentation](https://www.prisma.io/docs)
- [Auth.js Documentation](https://authjs.dev/)
- [Svelte Tutorial](https://learn.svelte.dev/)

## 📝 Notes

- **Document Version**: Created October 2024 from production codebase
- **Code Examples**: Extracted from live application
- **Migration Guide**: Based on SvelteKit 2.0+ best practices
- **Completeness**: All core features documented

## 🤝 Contributing to SvelteKit Version

When implementing in SvelteKit:

1. Follow the migration guide in **09-SVELTEKIT-MIGRATION.md**
2. Maintain feature parity with current version
3. Use TypeScript throughout
4. Write tests for new code
5. Document deviations from this design

## ⚠️ Important Notes

### What This Documentation IS:
✅ High-level architecture and design  
✅ Feature specifications and flows  
✅ Migration guide to SvelteKit  
✅ Best practices and patterns  

### What This Documentation IS NOT:
❌ Line-by-line code reproduction  
❌ Complete implementation  
❌ Deployment configuration  
❌ Production secrets/credentials  

## 📧 Questions?

For questions about:
- **Current implementation**: Review the source code in the parent repository
- **Migration strategy**: See **09-SVELTEKIT-MIGRATION.md**
- **Specific features**: Check the relevant document from the index above

---

**© 2025 Dylan Shah. All rights reserved.**

This documentation is provided for reference and educational purposes. The design patterns and architectural decisions are applicable to similar data visualization and analysis applications.
