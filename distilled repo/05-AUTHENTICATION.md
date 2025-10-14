# Authentication and Authorization

## Overview

Google OAuth 2.0 for authentication with Flask-Login for session management.

## Authentication Flow

### Login Process
```
User visits site
    ↓
Redirect to /login (if not authenticated)
    ↓
Google Sign-In button click
    ↓
Google OAuth popup
    ↓
Google returns JWT credential
    ↓
Send to /verify-google-token
    ↓
Backend verifies with Google
    ↓
Create/update user in database
    ↓
Create Flask-Login session
    ↓
Redirect to main app
```

### Session Maintenance
- Browser sends session cookie
- Flask-Login checks cookie
- Load user from database
- Set current_user context

### Logout
- Click "Sign Out"
- POST to /logout
- Clear session
- Redirect to /login

## Technology Stack

**Frontend:**
- Google Sign-In SDK
- Fetch API for token submission

**Backend:**
- Flask-Login for sessions
- google-auth library for verification
- Flask sessions (server-side)

## OAuth Configuration

**Environment Variables:**
- GOOGLE_CLIENT_ID

**OAuth Scopes:**
- openid (required)
- profile (basic info)
- email (user's email)

**Authorized Domains:**
- localhost:5001 (development)
- dylanshah.com (production)

## Token Verification

**Backend Process:**
1. Receive Google JWT token
2. Verify with Google's endpoint
3. Check issuer is Google
4. Extract user ID (sub) and email
5. Create/update user in database
6. Create Flask-Login session

## Authorization Pattern

**Route Protection:**
- Check `current_user.is_authenticated`
- Return 401 if not authenticated

**Data Isolation:**
- All queries filter by `user_id`
- Foreign key constraints
- No cross-user data access

## Security

**Session Security:**
- SECRET_KEY for session encryption
- HTTPS only in production
- HTTPOnly cookies (no JS access)
- SameSite=Lax (CSRF protection)

**Token Verification:**
- Never trust client tokens
- Always verify with Google
- Check token issuer
- Validate audience

**API Key Storage (Chat):**
- SHA-256 hash only
- No plaintext storage
- Compare hashes only

## SvelteKit Migration

**Replace with Auth.js:**
- Built-in Google OAuth provider
- Simpler configuration
- Works with SvelteKit load functions
- Can add more providers easily

**Structure:**
- Configure in hooks.server.ts
- Use locals.getSession()
- Automatic session management
- Type-safe user context

**Benefits:**
- Less boilerplate
- Better TypeScript support
- Modern auth patterns
- Easier to extend
