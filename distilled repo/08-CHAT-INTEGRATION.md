# AI Chat Integration (EpsilonAI)

## Overview

The application integrates OpenAI's GPT models to provide an AI assistant that can help users understand their data, interpret correlations, and answer questions about patterns and trends.

## Architecture

```
User Input
    ↓
Frontend Chat Component
    ↓
POST /api/chat/message
    ↓
Load Chat Session (API Key)
    ↓
Build Context (Data + Correlations)
    ↓
OpenAI API Call (GPT-4/3.5)
    ↓
Store Message + Response
    ↓
Return Response to Client
    ↓
Display in Chat UI
```

## Technology Stack

- **OpenAI SDK 1.51.2**: Python client library
- **GPT Models**: GPT-4 or GPT-3.5-turbo
- **API Key Management**: SHA-256 hashing for security
- **Message Storage**: SQLite via SQLAlchemy

## Chat Session Management

### Session Initialization

**Frontend:**
```typescript
async function initializeChat(apiKey: string): Promise<void> {
    try {
        const response = await fetch('/api/chat/initialize', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ api_key: apiKey })
        });
        
        const result = await response.json();
        
        if (result.success) {
            chatSessionId = result.session_id;
            showChatInterface();
            loadChatHistory();
        } else {
            alert('Failed to initialize chat: ' + result.error);
        }
    } catch (error) {
        console.error('Error initializing chat:', error);
        alert('Error initializing chat');
    }
}
```

**Backend:**
```python
@app.route('/api/chat/initialize', methods=['POST'])
def initialize_chat():
    """Initialize chat session with API key."""
    if not current_user.is_authenticated:
        return jsonify({'error': 'Not authenticated'}), 401
    
    try:
        api_key = request.json.get('api_key')
        if not api_key or not api_key.startswith('sk-'):
            return jsonify({'error': 'Invalid API key format'}), 400
        
        # Hash API key for storage (never store plaintext)
        api_key_hash = hashlib.sha256(api_key.encode()).hexdigest()
        
        # Check for existing session
        chat_session = ChatSession.query.filter_by(
            user_id=current_user.id
        ).first()
        
        if chat_session:
            # Update existing session
            chat_session.api_key_hash = api_key_hash
            chat_session.updated_at = datetime.utcnow()
        else:
            # Create new session
            chat_session = ChatSession(
                user_id=current_user.id,
                api_key_hash=api_key_hash
            )
            db.session.add(chat_session)
        
        db.session.commit()
        
        # Store unhashed key in server session (temporary)
        session['openai_api_key'] = api_key
        
        return jsonify({
            'success': True,
            'session_id': chat_session.id
        })
        
    except Exception as e:
        logger.error(f'Error initializing chat: {str(e)}')
        return jsonify({'error': 'Failed to initialize chat'}), 500
```

### API Key Security

**Storage Strategy:**
1. User provides API key via UI input (type="password")
2. Key sent to backend via HTTPS
3. Backend hashes key with SHA-256 (non-reversible)
4. Hash stored in database
5. Actual key stored in server session (temporary)
6. Key never logged or exposed

**Verification:**
```python
def verify_api_key(session_id: int, provided_hash: str) -> bool:
    """Verify API key hash matches stored hash."""
    session = ChatSession.query.get(session_id)
    return session and session.api_key_hash == provided_hash
```

## Message Flow

### Sending Messages

**Frontend:**
```typescript
async function sendChatMessage(): Promise<void> {
    const input = document.getElementById('messageInput') as HTMLInputElement;
    const message = input.value.trim();
    
    if (!message) return;
    
    // Add user message to UI
    addMessageToChat('user', message);
    input.value = '';
    
    try {
        // Get current correlations for context
        const correlationsResponse = await fetch('/api/correlations?limit=3');
        const correlationsData = await correlationsResponse.json();
        
        // Send message with context
        const response = await fetch('/api/chat/message', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                message: message,
                correlations: correlationsData.correlations
            })
        });
        
        const result = await response.json();
        
        if (result.response) {
            // Add assistant response to UI
            addMessageToChat('assistant', result.response);
        } else {
            throw new Error(result.error || 'No response from AI');
        }
    } catch (error) {
        console.error('Error sending message:', error);
        addMessageToChat('assistant', 'Sorry, I encountered an error. Please try again.');
    }
}
```

**Backend:**
```python
@app.route('/api/chat/message', methods=['POST'])
def chat_message():
    """Send message to AI and get response."""
    if not current_user.is_authenticated:
        return jsonify({'error': 'Not authenticated'}), 401
    
    try:
        user_message = request.json.get('message')
        correlations = request.json.get('correlations', [])
        
        if not user_message:
            return jsonify({'error': 'No message provided'}), 400
        
        # Get chat session
        chat_session = ChatSession.query.filter_by(
            user_id=current_user.id
        ).first()
        
        if not chat_session:
            return jsonify({'error': 'No chat session found'}), 400
        
        # Get API key from session
        api_key = session.get('openai_api_key')
        if not api_key:
            return jsonify({'error': 'API key not found. Please re-initialize.'}), 400
        
        # Initialize OpenAI client
        client = openai.OpenAI(api_key=api_key)
        
        # Build conversation context
        messages = build_conversation_context(
            chat_session, 
            user_message, 
            correlations
        )
        
        # Call OpenAI API
        completion = client.chat.completions.create(
            model="gpt-4",  # or "gpt-3.5-turbo"
            messages=messages,
            temperature=0.7,
            max_tokens=500
        )
        
        assistant_response = completion.choices[0].message.content
        
        # Store messages in database
        user_msg = ChatMessage(
            session_id=chat_session.id,
            role='user',
            content=clean_text(user_message)
        )
        
        assistant_msg = ChatMessage(
            session_id=chat_session.id,
            role='assistant',
            content=clean_text(assistant_response)
        )
        
        db.session.add(user_msg)
        db.session.add(assistant_msg)
        
        # Update correlation context
        if correlations:
            chat_session.last_correlation_context = json.dumps(correlations)
        
        chat_session.updated_at = datetime.utcnow()
        db.session.commit()
        
        return jsonify({
            'response': assistant_response,
            'correlations_used': bool(correlations)
        })
        
    except openai.AuthenticationError:
        return jsonify({'error': 'Invalid OpenAI API key'}), 401
    except openai.RateLimitError:
        return jsonify({'error': 'OpenAI rate limit exceeded'}), 429
    except Exception as e:
        logger.error(f'Error in chat message: {str(e)}')
        return jsonify({'error': f'Chat error: {str(e)}'}), 500
```

## Context Building

### System Prompt

```python
SYSTEM_PROMPT = """You are EpsilonAI, a helpful data analysis assistant. 
You help users understand their personal data, interpret correlations, 
and identify patterns and trends. Be concise, friendly, and focus on 
actionable insights.

Important: All data is personal health/life tracking data. Do not provide 
medical advice. If asked about health concerns, remind users to consult 
healthcare professionals."""
```

### Conversation Context

```python
def build_conversation_context(
    chat_session: ChatSession,
    user_message: str,
    correlations: List[Dict]
) -> List[Dict[str, str]]:
    """Build full conversation context for OpenAI API."""
    
    messages = [
        {"role": "system", "content": SYSTEM_PROMPT}
    ]
    
    # Add correlation context if available
    if correlations:
        context = "Current data correlations:\n"
        for corr in correlations:
            context += (
                f"- {corr['variable1']} and {corr['variable2']}: "
                f"{corr['direction']} {corr['strength']} correlation "
                f"(r={corr['correlation']:.3f}, p={corr['p_value']:.3f})\n"
            )
        messages.append({
            "role": "system",
            "content": context
        })
    
    # Add conversation history (last 10 messages)
    history = ChatMessage.query.filter_by(
        session_id=chat_session.id
    ).order_by(ChatMessage.timestamp.desc()).limit(10).all()
    
    for msg in reversed(history):
        messages.append({
            "role": msg.role,
            "content": msg.content
        })
    
    # Add current user message
    messages.append({
        "role": "user",
        "content": user_message
    })
    
    return messages
```

### Example Context

```json
[
  {
    "role": "system",
    "content": "You are EpsilonAI, a helpful data analysis assistant..."
  },
  {
    "role": "system",
    "content": "Current data correlations:\n- Sleep_Hours and Mood_Score: positive strong correlation (r=0.857, p=0.001)\n- Caffeine_Intake and Sleep_Quality: negative moderate correlation (r=-0.543, p=0.023)\n"
  },
  {
    "role": "user",
    "content": "Why am I sleeping poorly?"
  },
  {
    "role": "assistant",
    "content": "Based on your data, there's a moderate negative correlation between your caffeine intake and sleep quality. This suggests that higher caffeine consumption is associated with worse sleep. Consider reducing caffeine, especially in the afternoon and evening."
  },
  {
    "role": "user",
    "content": "What helps improve my mood?"
  }
]
```

## Chat History

### Loading History

```python
@app.route('/api/chat/history', methods=['GET'])
def get_chat_history():
    """Get chat history for current user."""
    if not current_user.is_authenticated:
        return jsonify({'error': 'Not authenticated'}), 401
    
    try:
        chat_session = ChatSession.query.filter_by(
            user_id=current_user.id
        ).first()
        
        if not chat_session:
            return jsonify({'messages': []})
        
        messages = ChatMessage.query.filter_by(
            session_id=chat_session.id
        ).order_by(ChatMessage.timestamp.asc()).all()
        
        return jsonify({
            'messages': [
                {
                    'role': msg.role,
                    'content': msg.content,
                    'timestamp': msg.timestamp.isoformat()
                }
                for msg in messages
            ]
        })
        
    except Exception as e:
        logger.error(f'Error getting chat history: {str(e)}')
        return jsonify({'error': 'Failed to get chat history'}), 500
```

### Clearing History

```python
@app.route('/api/chat/clear', methods=['POST'])
def clear_chat():
    """Clear chat history for current session."""
    if not current_user.is_authenticated:
        return jsonify({'error': 'Not authenticated'}), 401
    
    try:
        session_id = request.json.get('session_id')
        
        # Verify session belongs to user
        chat_session = ChatSession.query.filter_by(
            id=session_id,
            user_id=current_user.id
        ).first()
        
        if not chat_session:
            return jsonify({'error': 'Session not found'}), 404
        
        # Delete all messages
        ChatMessage.query.filter_by(
            session_id=session_id
        ).delete()
        
        db.session.commit()
        
        return jsonify({'success': True})
        
    except Exception as e:
        logger.error(f'Error clearing chat: {str(e)}')
        return jsonify({'error': 'Failed to clear chat'}), 500
```

## Text Sanitization

### Input Cleaning

```python
import unicodedata
import re

# Control characters to remove
_CTRL = ''.join(ch for ch in map(chr, range(32)) if ch not in ('\t', '\n'))
_CTRL += ''.join(map(chr, range(127, 160)))
_CTRL_RE = re.compile(f'[{re.escape(_CTRL)}]')

def clean_text(s: str) -> str:
    """Clean text for safe storage and display."""
    if not isinstance(s, str):
        s = str(s)
    
    # Normalize Unicode to NFKC form
    s = unicodedata.normalize('NFKC', s)
    
    # Remove problematic characters
    s = (s.replace('\x00', '')      # Null bytes
           .replace('\r', '')        # Carriage returns
           .replace('\u2028', '')    # Unicode line separator
           .replace('\u2029', ''))   # Unicode paragraph separator
    
    # Remove other control characters (keep \n and \t)
    s = _CTRL_RE.sub('', s)
    
    return s
```

### Output Sanitization

```python
def transport_sanitize_text(s: str) -> str:
    """Sanitize for HTTP transport (ASCII-only fallback)."""
    if not isinstance(s, str):
        s = str(s)
    
    # First clean normally
    s = clean_text(s)
    
    try:
        # Test UTF-8 encoding
        s.encode('utf-8')
        return s
    except Exception:
        # Fallback to ASCII if UTF-8 fails
        return s.encode('ascii', 'ignore').decode('ascii')
```

## UI Components

### Chat Panel

```html
<div id="chatContainer" class="chat-container">
    <!-- Toggle Button -->
    <button id="chatToggle" class="chat-toggle">
        <span id="chatToggleText">💬 Chat with EpsilonAI</span>
        <span id="correlationIndicator" class="correlation-indicator"></span>
    </button>
    
    <!-- Chat Panel -->
    <div id="chatPanel" class="chat-panel">
        <!-- API Key Section (shown first) -->
        <div id="apiKeySection" class="api-key-section">
            <h3>Enter OpenAI API Key</h3>
            <input type="password" id="apiKeyInput" placeholder="sk-...">
            <button id="initializeChatBtn" class="btn">Initialize Chat</button>
            <p class="help-text">
                Get your API key from 
                <a href="https://platform.openai.com/api-keys" target="_blank">OpenAI</a>
            </p>
        </div>
        
        <!-- Correlation Context -->
        <div id="correlationContext" style="display: none;">
            <h4>Context for AI:</h4>
            <ul id="correlationList"></ul>
        </div>
        
        <!-- Chat Messages -->
        <div id="chatMessages" style="display: none;"></div>
        
        <!-- Input -->
        <div id="chatInput" style="display: none;">
            <input type="text" id="messageInput" 
                   placeholder="I can help you understand your data!...">
            <button id="sendMessageBtn" class="btn-small">Send</button>
        </div>
        
        <!-- Controls -->
        <div id="chatControls" style="display: none;">
            <button id="clearChatBtn" class="btn-small">Clear Chat</button>
        </div>
    </div>
</div>
```

### Message Display

```typescript
function addMessageToChat(role: 'user' | 'assistant', content: string): void {
    const chatMessages = document.getElementById('chatMessages');
    if (!chatMessages) return;
    
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${role}`;
    
    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';
    contentDiv.textContent = content;
    
    messageDiv.appendChild(contentDiv);
    chatMessages.appendChild(messageDiv);
    
    // Auto-scroll to bottom
    chatMessages.scrollTop = chatMessages.scrollHeight;
}
```

### Correlation Indicator

```typescript
function updateCorrelationIndicator(correlations: any[]): void {
    const indicator = document.getElementById('correlationIndicator');
    if (!indicator) return;
    
    if (correlations && correlations.length > 0) {
        indicator.style.backgroundColor = '#4CAF50';  // Green
        indicator.title = `${correlations.length} correlations available`;
    } else {
        indicator.style.backgroundColor = '#ccc';  // Gray
        indicator.title = 'No correlations calculated';
    }
}
```

## Medical Disclaimer

### Disclaimer Modal

```html
<div id="disclaimerOverlay" class="modal-overlay" style="display: none;"></div>
<div id="disclaimerModal" class="modal" style="display: none;">
    <h3>Important</h3>
    <p>
        All content in this chat is informational and not a substitute 
        for professional medical advice.
    </p>
    <button id="acknowledgeDisclaimerBtn" class="btn">I Understand</button>
</div>
```

### Disclaimer Logic

```typescript
function showChatInterface(): void {
    // Show chat UI
    showChatPanel();
    
    // Check if disclaimer acknowledged
    const acknowledged = localStorage.getItem('epsilon_disclaimer_ack') === '1';
    
    if (!acknowledged) {
        // Show disclaimer modal
        document.getElementById('disclaimerModal').style.display = 'block';
        document.getElementById('disclaimerOverlay').style.display = 'block';
    }
}

document.getElementById('acknowledgeDisclaimerBtn')?.addEventListener('click', () => {
    // Store acknowledgment
    localStorage.setItem('epsilon_disclaimer_ack', '1');
    
    // Hide modal
    document.getElementById('disclaimerModal').style.display = 'none';
    document.getElementById('disclaimerOverlay').style.display = 'none';
});
```

## Error Handling

### OpenAI API Errors

```python
try:
    completion = client.chat.completions.create(...)
except openai.AuthenticationError:
    return jsonify({'error': 'Invalid API key'}), 401
except openai.RateLimitError:
    return jsonify({'error': 'Rate limit exceeded. Try again later.'}), 429
except openai.APIConnectionError:
    return jsonify({'error': 'Connection error. Check your internet.'}), 503
except openai.APIError as e:
    logger.error(f'OpenAI API error: {str(e)}')
    return jsonify({'error': 'AI service error. Try again.'}), 500
```

### Frontend Error Display

```typescript
try {
    const result = await sendMessage(message);
    displayResponse(result.response);
} catch (error) {
    addMessageToChat('assistant', 
        'Sorry, I encountered an error. Please check your API key and try again.'
    );
}
```

## Cost Optimization

### Token Management

```python
# Limit conversation history to last 10 messages
history = ChatMessage.query.filter_by(
    session_id=chat_session.id
).order_by(ChatMessage.timestamp.desc()).limit(10).all()

# Set max_tokens to control response length
completion = client.chat.completions.create(
    model="gpt-3.5-turbo",  # Cheaper than GPT-4
    max_tokens=500,          # Limit response length
    temperature=0.7
)
```

### Model Selection

**GPT-3.5-turbo**: $0.002 per 1K tokens (recommended for most users)
**GPT-4**: $0.03 per 1K tokens (better quality, higher cost)

## Migration to SvelteKit

### SvelteKit Server Route

```typescript
// +server.ts
import { OpenAI } from 'openai';

export async function POST({ request, locals }) {
  const { message, correlations } = await request.json();
  const session = await locals.getSession();
  
  if (!session) {
    return json({ error: 'Not authenticated' }, { status: 401 });
  }
  
  const openai = new OpenAI({ apiKey: session.user.apiKey });
  
  const completion = await openai.chat.completions.create({
    model: 'gpt-4',
    messages: buildContext(session.chatHistory, message, correlations)
  });
  
  return json({ response: completion.choices[0].message.content });
}
```

### Streaming Responses

```typescript
export async function POST({ request, locals }) {
  const stream = await openai.chat.completions.create({
    model: 'gpt-4',
    stream: true,
    messages: [...]
  });
  
  return new Response(stream.toReadableStream(), {
    headers: { 'Content-Type': 'text/event-stream' }
  });
}
```

**Benefits:**
- Real-time response display (typewriter effect)
- Better user experience for long responses
- Lower perceived latency
