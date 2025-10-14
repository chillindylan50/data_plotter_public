# Authentication and Authorization

## Overview

The application uses Google OAuth 2.0 for authentication with Flask-Login for session management. All routes require authentication except the login page itself.

## Authentication Flow

### 1. Login Process

```
User visits site
    ↓
Check if authenticated (Flask-Login)
    ↓
NO → Redirect to /login
    ↓
Show Google Sign-In button
    ↓
User clicks "Sign in with Google"
    ↓
Google OAuth popup
    ↓
User grants permission
    ↓
Google returns JWT credential
    ↓
Send credential to /verify-google-token
    ↓
Backend verifies with Google
    ↓
Extract user_id and email
    ↓
Create/update user in database
    ↓
Create Flask-Login session
    ↓
Redirect to main app (/)
```

### 2. Session Maintenance

```
User loads page
    ↓
Browser sends session cookie
    ↓
Flask-Login checks cookie
    ↓
Load user from database
    ↓
Set current_user context
    ↓
Render page or API response
```

### 3. Logout Process

```
User clicks "Sign Out"
    ↓
POST to /logout
    ↓
Flask-Login logout_user()
    ↓
Clear server session
    ↓
Clear cookies
    ↓
Redirect to /login
```

## Technology Stack

### Frontend
- **Google Sign-In SDK**: Client-side OAuth integration
- **Fetch API**: Send token to backend

### Backend
- **Flask-Login 0.6.3**: Session management
- **google-auth 2.40.3**: Token verification
- **Flask Sessions**: Server-side session storage

## Google OAuth Configuration

### Environment Variables
```bash
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
```

### OAuth Scopes
```
- openid           # Required for OAuth
- profile          # User's basic profile info
- email            # User's email address
```

### Authorized Domains
- `localhost:5001` (development)
- `dylanshah.com` (production)

## Frontend Implementation

### Login Page (login.html)

```html
<!DOCTYPE html>
<html>
<head>
    <title>Login - Data Plotter</title>
    <script src="https://accounts.google.com/gsi/client" async></script>
    <link rel="stylesheet" href="/static/app_styles.css">
</head>
<body>
    <div class="login-container">
        <h1>📊 Data Plotter</h1>
        <p>Sign in with Google to continue</p>
        
        <!-- Google Sign-In Button -->
        <div id="g_id_onload"
             data-client_id="{{ google_client_id }}"
             data-callback="handleCredentialResponse"
             data-auto_prompt="false">
        </div>
        
        <div class="g_id_signin"
             data-type="standard"
             data-size="large"
             data-theme="outline"
             data-text="sign_in_with"
             data-shape="rectangular"
             data-logo_alignment="left">
        </div>
    </div>
</body>
</html>
```

### JavaScript Handler

```javascript
async function handleCredentialResponse(response) {
    const token = response.credential;  // JWT from Google
    
    try {
        const result = await fetch('/verify-google-token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ token: token })
        });
        
        const data = await result.json();
        
        if (data.success) {
            // Redirect to main app
            window.location.href = '/';
        } else {
            // Show error message
            document.getElementById('error').textContent = data.error;
        }
    } catch (error) {
        console.error('Authentication error:', error);
        document.getElementById('error').textContent = 
            'Authentication failed. Please try again.';
    }
}
```

## Backend Implementation

### Token Verification Route

```python
@app.route('/verify-google-token', methods=['POST'])
@app.route('/epsilon/verify-google-token', methods=['POST'])
def verify_google_token():
    try:
        # Get token from request
        token = request.json.get('token')
        if not token:
            return jsonify({'success': False, 'error': 'No token provided'}), 400

        # Verify token with Google
        idinfo = id_token.verify_oauth2_token(
            token,
            requests.Request(),
            os.getenv('GOOGLE_CLIENT_ID')
        )
        
        # Verify issuer
        if idinfo['iss'] not in ['accounts.google.com', 'https://accounts.google.com']:
            raise ValueError('Invalid issuer')

        # Extract user information
        user_id = idinfo['sub']      # Google's unique user ID
        email = idinfo['email']       # User's email address
        
        # Create or update user in database
        ensure_user_exists(user_id, email)
        
        # Create Flask-Login session
        user = User.query.get(user_id)
        login_user(user)
        session['user_email'] = email
        
        return jsonify({
            'success': True,
            'user': {
                'id': user_id,
                'email': email
            }
        })
        
    except ValueError as e:
        logger.error(f'Token verification failed: {str(e)}')
        return jsonify({'success': False, 'error': 'Invalid token'}), 401
    except Exception as e:
        logger.error(f'Authentication error: {str(e)}')
        return jsonify({'success': False, 'error': 'Authentication failed'}), 500
```

### User Management

```python
def ensure_user_exists(user_id: str, email: str) -> None:
    """Create or update user in database."""
    user = User.query.get(user_id)
    if not user:
        # New user
        user = User(
            id=user_id,
            email=email,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
        db.session.add(user)
        logger.info(f'Created new user: {email} ({user_id})')
    else:
        # Existing user - update email and timestamp
        user.email = email
        user.updated_at = datetime.utcnow()
        logger.info(f'Updated existing user: {email} ({user_id})')
    
    db.session.commit()
```

### Flask-Login Configuration

```python
from flask_login import LoginManager, login_user, logout_user, current_user

# Initialize Flask-Login
login_manager = LoginManager()
login_manager.init_app(app)
login_manager.login_view = 'login'  # Redirect to login page

@login_manager.user_loader
def load_user(user_id):
    """Load user from database for Flask-Login."""
    if 'user_email' in session:
        return User.query.get(user_id)
    return None
```

### User Model

```python
from flask_login import UserMixin

class User(UserMixin, db.Model):
    """User model with Flask-Login integration."""
    __tablename__ = 'users'
    
    id = Column(String(255), primary_key=True)  # Google user ID
    email = Column(String(255), unique=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Flask-Login required methods (inherited from UserMixin):
    # - is_authenticated
    # - is_active
    # - is_anonymous
    # - get_id()
```

## Authorization Pattern

### Route Protection

All data routes require authentication:

```python
@app.route('/get_data', methods=['GET'])
def get_data():
    # Check authentication
    if not current_user.is_authenticated:
        return jsonify([]), 401
    
    # Load user's data
    user_data = load_user_data(current_user.id)
    return jsonify(user_data), 200
```

### Data Isolation

All database queries filter by user ID:

```python
def load_user_data(user_id: str) -> List[Dict[str, Any]]:
    """Load data only for specified user."""
    data_points = DataPoint.query.filter_by(user_id=user_id).all()
    return [point.to_dict() for point in data_points]

def get_user_correlations(user_id: str) -> List[Dict[str, Any]]:
    """Get correlations only for specified user."""
    correlations = CorrelationResult.query.filter_by(user_id=user_id).all()
    return [corr.to_dict() for corr in correlations]
```

### Frontend Authentication Check

```typescript
async function displayUserName() {
    try {
        const response = await fetch(baseUrl + 'auth-status');
        const data = await response.json();
        
        if (data.authenticated && data.email) {
            // User is logged in
            document.getElementById('user-email').textContent = 
                "Logged in as " + data.email;
        } else {
            // Not logged in - redirect handled by Flask
            window.location.href = '/login';
        }
    } catch (error) {
        console.error('Failed to check auth status:', error);
    }
}
```

## Session Management

### Flask Session Configuration

```python
app.config['SECRET_KEY'] = os.getenv('FLASK_SECRET_KEY', os.urandom(32).hex())
app.config['SESSION_COOKIE_SECURE'] = True   # HTTPS only in production
app.config['SESSION_COOKIE_HTTPONLY'] = True # No JavaScript access
app.config['SESSION_COOKIE_SAMESITE'] = 'Lax'  # CSRF protection
app.config['PERMANENT_SESSION_LIFETIME'] = timedelta(days=7)
```

### Session Data

```python
session['user_email']     # User's email for display
# Flask-Login manages its own session data automatically
```

## Security Considerations

### 1. Token Verification

- **Never trust client tokens**: Always verify with Google's endpoint
- **Check issuer**: Ensure token from `accounts.google.com`
- **Validate audience**: Match with your `GOOGLE_CLIENT_ID`

### 2. Session Security

- **Secret Key**: Use strong random secret key
- **HTTPS Only**: Set `SESSION_COOKIE_SECURE=True` in production
- **HTTPOnly**: Prevent XSS attacks with `SESSION_COOKIE_HTTPONLY=True`
- **SameSite**: Prevent CSRF with `SESSION_COOKIE_SAMESITE='Lax'`

### 3. Data Isolation

- **Always filter by user_id**: Never expose other users' data
- **No user ID in URLs**: Use session-based authentication
- **Foreign key constraints**: Database enforces data isolation

### 4. API Key Storage (Chat Feature)

- **Never store plaintext**: Hash with SHA-256
- **No reversible encryption**: Only compare hashes
- **Per-session keys**: Users can change keys anytime

```python
import hashlib

def hash_api_key(api_key: str) -> str:
    """Hash OpenAI API key for secure storage."""
    return hashlib.sha256(api_key.encode()).hexdigest()

# Store only hash
chat_session.api_key_hash = hash_api_key(api_key)
```

## Error Handling

### Authentication Errors

```python
try:
    idinfo = id_token.verify_oauth2_token(...)
except ValueError as e:
    # Invalid token, expired, wrong audience, etc.
    logger.error(f'Token verification failed: {str(e)}')
    return jsonify({'success': False, 'error': 'Invalid token'}), 401
except Exception as e:
    # Network errors, Google API issues, etc.
    logger.error(f'Authentication error: {str(e)}')
    return jsonify({'success': False, 'error': 'Authentication failed'}), 500
```

### Session Expiration

```python
@login_manager.unauthorized_handler
def unauthorized():
    """Handle unauthorized access."""
    if request.is_json:
        return jsonify({'error': 'Unauthorized'}), 401
    else:
        return redirect(url_for('login'))
```

## Testing Authentication

### Manual Testing
1. Visit `/login`
2. Click "Sign in with Google"
3. Grant permissions
4. Verify redirect to `/`
5. Check user email displayed
6. Click "Sign Out"
7. Verify redirect to `/login`

### Unit Testing

```python
def test_login_required(client):
    """Test that routes require authentication."""
    response = client.get('/get_data')
    assert response.status_code == 401

def test_successful_login(client, mock_google_token):
    """Test successful login flow."""
    response = client.post('/verify-google-token', 
                          json={'token': mock_google_token})
    assert response.status_code == 200
    assert response.json['success'] == True
```

## Migration to SvelteKit

### SvelteKit Auth Options

1. **Auth.js (formerly NextAuth.js)**
   ```typescript
   // src/hooks.server.ts
   import { SvelteKitAuth } from "@auth/sveltekit"
   import Google from "@auth/sveltekit/providers/google"
   
   export const handle = SvelteKitAuth({
     providers: [Google({
       clientId: GOOGLE_CLIENT_ID,
       clientSecret: GOOGLE_CLIENT_SECRET
     })]
   })
   ```

2. **JWT-based Auth**
   - Issue JWT on successful Google verification
   - Store in httpOnly cookie
   - Verify JWT on each request
   - Stateless (better for scaling)

3. **Session-based Auth**
   - Similar to current Flask-Login approach
   - Use database or Redis for sessions
   - SvelteKit locals for user context

### Recommended Approach

**Use Auth.js with Google provider:**

**Advantages:**
- Built-in Google OAuth support
- Handles token refresh automatically
- TypeScript support
- Works with SvelteKit load functions
- Can easily add more providers later

**Implementation:**
```svelte
<!-- +page.server.ts -->
export async function load({ locals }) {
  const session = await locals.getSession();
  
  if (!session) {
    throw redirect(303, '/login');
  }
  
  return {
    user: session.user
  };
}
```

See `09-SVELTEKIT-MIGRATION.md` for detailed migration guide.
