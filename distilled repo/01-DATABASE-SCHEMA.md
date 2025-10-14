# Database Schema

## Overview

SQLite database with SQLAlchemy ORM. Five main tables supporting multi-user data management and chat sessions.

## Tables

### 1. Users
**Purpose**: Store user authentication info

**Fields:**
- id (Primary Key) - Google OAuth user ID
- email - User's email address
- created_at, updated_at - Timestamps

**Relationships:**
- Has many: DataPoints, ChatSessions, CorrelationResults

### 2. DataPoint
**Purpose**: Store time-series data entries

**Fields:**
- id (Auto-increment Primary Key)
- user_id (Foreign Key → users)
- date - Data point date
- data (JSON) - Variable values as JSON
- created_at, updated_at - Timestamps

**Example JSON:**
```json
{
  "Variable_1": 42.5,
  "Variable_2": 38.2,
  "Sleep_Hours": 7.5
}
```

### 3. ChatSession
**Purpose**: Store chat session metadata

**Fields:**
- id (Auto-increment Primary Key)
- user_id (Foreign Key → users)
- api_key_hash - SHA-256 hash of OpenAI key
- last_correlation_context (JSON) - Recent correlations
- created_at, updated_at - Timestamps

**Relationships:**
- Has many: ChatMessages

### 4. ChatMessage
**Purpose**: Store individual chat messages

**Fields:**
- id (Auto-increment Primary Key)
- session_id (Foreign Key → chat_sessions)
- role - 'user', 'assistant', or 'system'
- content (Text) - Message text
- timestamp - When sent

### 5. CorrelationResult
**Purpose**: Cache calculated correlations

**Fields:**
- id (Auto-increment Primary Key)
- user_id (Foreign Key → users)
- variable_x, variable_y - Variable names
- correlation (Float) - Pearson's r (-1 to 1)
- p_value (Float) - Statistical significance
- strength - 'weak', 'moderate', 'strong'
- direction - 'positive' or 'negative'
- calculated_at - Timestamp

## Relationships

```
User (1) ← (many) DataPoint
User (1) ← (many) ChatSession
User (1) ← (many) CorrelationResult
ChatSession (1) ← (many) ChatMessage
```

## Database Operations

**User Operations:**
- ensure_user_exists() - Create if needed
- load_user() - Get by ID

**Data Operations:**
- load_user_data() - Get all data points
- save_user_data() - Bulk save/replace
- add_data_point() - Add single point
- clear_user_data() - Delete all user data

**Correlation Operations:**
- calculate_correlations() - Compute all pairs
- get_all_correlations() - Retrieve results
- get_top_correlations() - Get strongest N

## Data Isolation

Every query filters by `user_id` to ensure users only see their own data. Foreign key constraints enforce referential integrity.

## SvelteKit Migration

**Database Change: SQLite → PostgreSQL**
- Better concurrency
- Production-ready
- Better performance

**ORM Change: SQLAlchemy → Prisma**
- TypeScript-native
- Better type safety
- Auto-generated client
- Migration system built-in

**Schema Definition (Prisma):**
- Define models in schema.prisma
- Relationships with @relation
- Generate TypeScript types
- Run migrations with CLI

**Benefits:**
- Type-safe database access
- No manual SQL
- Automatic migrations
- Better developer experience
