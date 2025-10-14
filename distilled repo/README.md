# Data Plotter - Design Documentation

High-level design documentation for the Data Plotter application to guide SvelteKit re-implementation.

## 📋 Documents

1. **[00-OVERVIEW.md](./00-OVERVIEW.md)** - Application architecture, tech stack, key design principles
2. **[01-DATABASE-SCHEMA.md](./01-DATABASE-SCHEMA.md)** - Database design with 5 tables and relationships
3. **[02-API-ENDPOINTS.md](./02-API-ENDPOINTS.md)** - REST API specifications for 15+ endpoints
4. **[03-FRONTEND-ARCHITECTURE.md](./03-FRONTEND-ARCHITECTURE.md)** - Component structure and state management
5. **[04-DESIGN-SYSTEM.md](./04-DESIGN-SYSTEM.md)** - CSS design system and responsive patterns
6. **[05-AUTHENTICATION.md](./05-AUTHENTICATION.md)** - Google OAuth flow and security
7. **[06-PLOTLY-VISUALIZATION.md](./06-PLOTLY-VISUALIZATION.md)** - Plotly.js chart implementation
8. **[07-CORRELATION-ANALYSIS.md](./07-CORRELATION-ANALYSIS.md)** - Statistical analysis and algorithms
9. **[08-CHAT-INTEGRATION.md](./08-CHAT-INTEGRATION.md)** - OpenAI chat assistant integration
10. **[09-SVELTEKIT-MIGRATION.md](./09-SVELTEKIT-MIGRATION.md)** - Complete migration strategy

## 🎯 Current Application

**Live**: https://dylanshah.com/epsilon

**Features:**
- Personal data tracking with interactive table
- Plotly.js charts with dual Y-axes
- Statistical correlation analysis
- AI chat assistant (OpenAI)

**Tech Stack:**
- Backend: Flask 3.1.1 (Python)
- Frontend: TypeScript 5.3.3
- Database: SQLite + SQLAlchemy
- Auth: Google OAuth 2.0

## 🚀 Migration Target

- Framework: SvelteKit 2.0+
- Database: PostgreSQL + Prisma
- Auth: Auth.js with Google provider
- Language: Full-stack TypeScript

## 📖 Quick Start

**Understanding the system:**
1. Read 00-OVERVIEW.md (10 min)
2. Review 01-DATABASE-SCHEMA.md (10 min)
3. Browse 02-API-ENDPOINTS.md (10 min)

**Implementing in SvelteKit:**
1. Start with 09-SVELTEKIT-MIGRATION.md
2. Follow step-by-step migration guide
3. Reference feature docs as needed

**Specific features:**
- Authentication → 05-AUTHENTICATION.md
- Visualization → 06-PLOTLY-VISUALIZATION.md
- Statistics → 07-CORRELATION-ANALYSIS.md
- AI Chat → 08-CHAT-INTEGRATION.md

## 🏗️ Architecture

**Current:**
```
Browser → TypeScript → Flask API → SQLAlchemy → SQLite
```

**Target:**
```
Browser → Svelte Components → SvelteKit Routes → Prisma → PostgreSQL
```

## 📊 Data Flow Examples

**Adding data:**
```
User input → Validation → API POST → Database → Recalculate correlations → UI update
```

**Calculating correlations:**
```
User click → API POST → Load data → Calculate pairs → Store results → Display matrix
```

**Chat message:**
```
User message → Get correlations → API POST → OpenAI → Store response → Display
```

## 📝 Document Structure

Each document includes:
- Overview of the feature
- Technology stack used
- Implementation approach
- Migration guidance for SvelteKit

## ⚠️ Important

This is **high-level design documentation**, not a complete implementation guide.

- ✅ Architecture and patterns
- ✅ Feature specifications
- ✅ Migration strategy
- ❌ Detailed code implementation
- ❌ Production configuration

## 📚 Resources

**Current:**
- [Live Application](https://dylanshah.com/epsilon)
- [GitHub Repository](https://github.com/chillindylan50/data_plotter_public)

**Migration:**
- [SvelteKit Docs](https://kit.svelte.dev/)
- [Prisma Docs](https://www.prisma.io/docs)
- [Auth.js Docs](https://authjs.dev/)

---

© 2025 Dylan Shah. For reference and educational purposes.
