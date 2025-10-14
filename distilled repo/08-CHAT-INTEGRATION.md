# Chat Integration (EpsilonAI)

## Overview

AI chat assistant using OpenAI's GPT models to help users understand their data and interpret correlations.

## Architecture

```
User Message → Frontend
    ↓
Load Correlations (context)
    ↓
POST /api/chat/message
    ↓
OpenAI API
    ↓
Store Response
    ↓
Display to User
```

## Key Features

**Session Management:**
- One chat session per user
- API key hashed (SHA-256) for security
- Never store plaintext keys

**Context Building:**
- System prompt defines AI personality
- Top 3 correlations included for context
- Last 10 messages for conversation history

**Message Flow:**
1. User sends message
2. Backend retrieves chat session
3. Builds context with correlations and history
4. Calls OpenAI API
5. Stores user message and AI response
6. Returns response to client

## API Key Security

- User provides OpenAI API key
- Hashed with SHA-256 before storage
- Actual key stored in session (temporary)
- Never logged or exposed

## Context Strategy

**System Prompt:**
- Defines AI as data analysis assistant
- Sets tone and behavior
- Includes medical disclaimer

**User Data Context:**
- Top correlations by strength
- Variable names and correlation values
- Statistical significance

**Conversation History:**
- Last 10 messages for continuity
- Maintains conversation flow
- Limits token usage

## Medical Disclaimer

- Shown before first use
- Acknowled stored in localStorage
- Reminds users AI is informational only
- Not a substitute for professional advice

## Components

**Chat Toggle Button:**
- Fixed position at bottom right
- Shows correlation indicator badge
- Toggles panel open/closed

**API Key Input:**
- Password field for security
- Initialize button to start session
- Link to OpenAI API keys page

**Message Display:**
- User messages: right-aligned, blue background
- AI messages: left-aligned, gray background
- Auto-scroll to latest message

**Controls:**
- Clear chat history
- Keeps session metadata

## Error Handling

**OpenAI API Errors:**
- Invalid API key
- Rate limit exceeded
- Connection errors
- Service errors

**Frontend Display:**
- Show user-friendly error messages
- Prompt to check API key
- Suggest retry for temporary errors

## Cost Optimization

- Limit conversation history to 10 messages
- Set max_tokens to control response length
- Use GPT-3.5-turbo by default (cheaper)
- GPT-4 available but more expensive

## SvelteKit Migration

**Changes Needed:**
- Convert to Svelte component
- Use SvelteKit server routes
- Implement streaming for real-time responses
- Use Svelte stores for chat state

**Benefits:**
- Reactive message updates
- Better component organization
- Streaming support built-in
- Type-safe throughout
