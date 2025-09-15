"""Database models for the diary plotter application.

This module defines the SQLAlchemy models for storing user data and data points
in a relational database instead of CSV files.
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

class DataVariable(db.Model):
    """Model for storing variable definitions and metadata."""
    __tablename__ = 'data_variables'
    
    id = Column(Integer, primary_key=True)
    user_id = Column(String(255), ForeignKey('users.id'), nullable=False)
    name = Column(String(255), nullable=False)
    display_name = Column(String(255), nullable=False)
    data_type = Column(String(50), default='float')  # float, int, string
    created_at = Column(DateTime, default=datetime.utcnow)
    
    def __repr__(self):
        return f'<DataVariable {self.name} for user {self.user_id}>'
