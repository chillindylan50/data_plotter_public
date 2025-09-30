"""Database models for the diary plotter application.

This module defines the SQLAlchemy models for storing user data and data points
in a relational database, using SQLAlchemy and SQLite.
"""

from datetime import datetime
from flask_sqlalchemy import SQLAlchemy
from flask_login import UserMixin
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship

db = SQLAlchemy()

class User(UserMixin, db.Model):
    """User model for storing user information."""
    __tablename__ = 'users'
    
    id = Column(String(255), primary_key=True)  # Google user ID
    email = Column(String(255), unique=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationship to data points
    data_points = relationship('DataPoint', backref='user', lazy=True, cascade='all, delete-orphan')
    
    def __repr__(self):
        return f'<User {self.email}>'

class DataPoint(db.Model):
    """Data point model for storing individual data entries."""
    __tablename__ = 'data_points'
    
    id = Column(Integer, primary_key=True)
    user_id = Column(String(255), ForeignKey('users.id'), nullable=False)
    date = Column(DateTime, nullable=False)
    data = Column(Text, nullable=False)  # JSON string of variable data
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def __repr__(self):
        return f'<DataPoint {self.id} for user {self.user_id}>'


class ChatSession(db.Model):
    """Chat session model for storing ChatGPT conversations."""
    __tablename__ = 'chat_sessions'
    
    id = Column(Integer, primary_key=True)
    user_id = Column(String(255), ForeignKey('users.id'), nullable=False)
    api_key_hash = Column(String(255))  # Hashed OpenAI API key
    last_correlation_context = Column(Text)  # JSON of last sent correlations
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationship to chat messages
    messages = relationship('ChatMessage', backref='session', lazy=True, cascade='all, delete-orphan')
    
    def __repr__(self):
        return f'<ChatSession {self.id} for user {self.user_id}>'


class ChatMessage(db.Model):
    """Chat message model for storing individual chat messages."""
    __tablename__ = 'chat_messages'
    
    id = Column(Integer, primary_key=True)
    session_id = Column(Integer, ForeignKey('chat_sessions.id'), nullable=False)
    role = Column(String(20), nullable=False)  # 'user', 'assistant', 'system'
    content = Column(Text, nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow)
    
    def __repr__(self):
        return f'<ChatMessage {self.id} ({self.role})>'



class CorrelationResult(db.Model):
    """Model for storing calculated correlation results."""
    __tablename__ = 'correlation_results'
    
    id = Column(Integer, primary_key=True)
    user_id = Column(String(255), ForeignKey('users.id'), nullable=False)
    variable_x = Column(String(255), nullable=False)
    variable_y = Column(String(255), nullable=False)
    correlation = Column(Float, nullable=False)
    p_value = Column(Float, nullable=False)
    strength = Column(String(50), nullable=False)  # 'weak', 'moderate', 'strong'
    direction = Column(String(50), nullable=False)  # 'positive', 'negative'
    calculated_at = Column(DateTime, default=datetime.utcnow)
    
    def __repr__(self):
        return f'<CorrelationResult {self.variable_x}↔{self.variable_y}: r={self.correlation}>'
