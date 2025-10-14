# Database Schema and Models

## Overview

The application uses SQLite with SQLAlchemy ORM for data persistence. The schema supports multi-user data management, chat sessions, and correlation caching.

## Database Technology

- **DBMS**: SQLite 3
- **ORM**: SQLAlchemy 2.0.35
- **Flask Integration**: Flask-SQLAlchemy 3.1.1
- **Location**: `instance/user_data.db` (auto-created)

## Entity Relationship Diagram

```
┌──────────────┐
│    User      │
│──────────────│
│ id (PK)      │◄────┐
│ email        │     │
│ created_at   │     │
│ updated_at   │     │
└──────────────┘     │
                     │
        ┌────────────┼────────────┬──────────────┐
        │            │            │              │
        │            │            │              │
┌───────▼──────┐ ┌───▼────────┐ ┌▼──────────────┐ ┌──────────────────┐
│  DataPoint   │ │ChatSession │ │CorrelationResult│ │   ChatMessage   │
│──────────────│ │────────────│ │──────────────  │ │──────────────────│
│ id (PK)      │ │ id (PK)    │ │ id (PK)        │ │ id (PK)          │
│ user_id (FK) │ │ user_id(FK)│ │ user_id (FK)   │ │ session_id (FK) ◄┤
│ date         │ │ api_key_h. │ │ variable_x     │ │ role             │
│ data (JSON)  │ │ last_corr. │ │ variable_y     │ │ content          │
│ created_at   │ │ created_at │ │ correlation    │ │ timestamp        │
│ updated_at   │ │ updated_at │ │ p_value        │ └──────────────────┘
└──────────────┘ └────────────┘ │ strength       │
                                │ direction      │
                                │ calculated_at  │
                                └────────────────┘
```

## Table Definitions

### Users Table

Stores user authentication and profile information.

```python
class User(UserMixin, db.Model):
    __tablename__ = 'users'
    
    id: String(255)              # Google OAuth user ID (Primary Key)
    email: String(255)           # User's email address (Unique)
    created_at: DateTime         # Account creation timestamp
    updated_at: DateTime         # Last update timestamp
    
    # Relationships
    data_points: List[DataPoint]
    chat_sessions: List[ChatSession]
    correlation_results: List[CorrelationResult]
```

**Key Points:**
- `id` is the Google OAuth `sub` claim (unique user identifier)
- `email` is stored for display purposes
- Timestamps are in UTC
- Cascade delete removes all user data when user is deleted

### DataPoint Table

Stores time-series data points for each user.

```python
class DataPoint(db.Model):
    __tablename__ = 'data_points'
    
    id: Integer                  # Auto-increment ID (Primary Key)
    user_id: String(255)         # Foreign Key → users.id
    date: DateTime               # Data point date (required)
    data: Text                   # JSON string of variable:value pairs
    created_at: DateTime         # Record creation timestamp
    updated_at: DateTime         # Record update timestamp
```

**Data Field Structure:**
```json
{
  "Variable_1": 42.5,
  "Variable_2": 38.2,
  "Sleep_Hours": 7.5,
  "Mood_Score": 8
}
```

**Key Points:**
- Date is stored as datetime for indexing and queries
- Variable data stored as JSON for flexibility
- No schema enforcement on variable names (user-defined)
- Indexed by `user_id` and `date` for performance

### ChatSession Table

Stores chat session metadata and context.

```python
class ChatSession(db.Model):
    __tablename__ = 'chat_sessions'
    
    id: Integer                  # Auto-increment ID (Primary Key)
    user_id: String(255)         # Foreign Key → users.id
    api_key_hash: String(255)    # SHA-256 hash of OpenAI API key
    last_correlation_context: Text  # JSON of last sent correlations
    created_at: DateTime         # Session creation timestamp
    updated_at: DateTime         # Last activity timestamp
    
    # Relationships
    messages: List[ChatMessage]
```

**last_correlation_context Format:**
```json
[
  {
    "variable1": "Variable_1",
    "variable2": "Variable_2",
    "correlation": 0.857,
    "p_value": 0.001,
    "strength": "strong",
    "direction": "positive"
  }
]
```

**Key Points:**
- One active session per user (checked by business logic)
- API key never stored in plaintext (only hash)
- Context helps AI understand recent analysis
- Updated whenever user sends chat message

### ChatMessage Table

Stores individual chat messages in conversation history.

```python
class ChatMessage(db.Model):
    __tablename__ = 'chat_messages'
    
    id: Integer                  # Auto-increment ID (Primary Key)
    session_id: Integer          # Foreign Key → chat_sessions.id
    role: String(20)             # Message sender: 'user', 'assistant', 'system'
    content: Text                # Message text content
    timestamp: DateTime          # Message timestamp
```

**Key Points:**
- Messages ordered by timestamp for conversation flow
- `role` field follows OpenAI chat format convention
- No message editing/deletion (append-only for history)
- Cascade delete when session is deleted

### CorrelationResult Table

Caches calculated correlation results for performance.

```python
class CorrelationResult(db.Model):
    __tablename__ = 'correlation_results'
    
    id: Integer                  # Auto-increment ID (Primary Key)
    user_id: String(255)         # Foreign Key → users.id
    variable_x: String(255)      # First variable name
    variable_y: String(255)      # Second variable name
    correlation: Float           # Pearson correlation coefficient (-1 to 1)
    p_value: Float               # Statistical significance (0 to 1)
    strength: String(50)         # Classification: weak/moderate/strong
    direction: String(50)        # 'positive' or 'negative'
    calculated_at: DateTime      # Calculation timestamp
```

**Strength Classification:**
- `|r| > 0.7`: "strong"
- `|r| > 0.3`: "moderate"  
- `|r| > 0.1`: "weak"
- `|r| ≤ 0.1`: "very weak"

**Key Points:**
- Computed for all numeric variable pairs
- Recalculated when user data changes
- Indexed by `user_id` for fast retrieval
- Provides context to chat assistant

## Database Operations (Service Layer)

Located in `database.py`, these functions abstract SQLAlchemy operations:

### User Operations
- `ensure_user_exists(user_id, email)` - Create user if not exists
- `load_user(user_id)` - Load user by ID

### Data Operations
- `load_user_data(user_id)` - Get all data points as list of dicts
- `save_user_data(user_id, data, reset=False)` - Bulk save/replace data
- `add_data_point(user_id, data_point)` - Add single data point
- `clear_user_data(user_id)` - Delete all user's data points

### Correlation Operations
- `calculate_correlations(user_id)` - Compute and store all correlations
- `get_all_correlations(user_id, limit=None)` - Retrieve correlations ordered by strength
- `get_top_correlations(user_id, count=3)` - Get top N strongest correlations
- `get_correlation_strength(abs_correlation)` - Helper to classify strength

## Migration Considerations for SvelteKit

### Recommended Changes

1. **Switch to PostgreSQL** for better concurrency and production readiness
2. **Use Prisma or Drizzle ORM** for TypeScript-native database access
3. **Add composite indexes** on frequently queried fields:
   - `data_points(user_id, date)`
   - `correlation_results(user_id, correlation DESC)`
4. **Consider time-series optimization** for large datasets
5. **Add data versioning** for audit trail
6. **Implement soft deletes** for data recovery

### Schema Mapping

| Current (Python/SQLAlchemy) | SvelteKit (Prisma) |
|----------------------------|-------------------|
| String(255) | String @db.VarChar(255) |
| Text | String @db.Text |
| DateTime | DateTime |
| Float | Float |
| Integer | Int @default(autoincrement()) |
| ForeignKey | Relation with @relation |

### Prisma Schema Example

```prisma
model User {
  id        String   @id @db.VarChar(255)
  email     String   @unique @db.VarChar(255)
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")
  
  dataPoints         DataPoint[]
  chatSessions       ChatSession[]
  correlationResults CorrelationResult[]
  
  @@map("users")
}

model DataPoint {
  id        Int      @id @default(autoincrement())
  userId    String   @map("user_id") @db.VarChar(255)
  date      DateTime
  data      Json
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")
  
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  @@index([userId, date])
  @@map("data_points")
}

// ... other models
```

## Database Initialization

Currently handled by Flask app startup:
```python
def create_tables():
    with app.app_context():
        db.create_all()
```

For SvelteKit, use Prisma migrations:
```bash
npx prisma migrate dev --name init
npx prisma generate
```
