"""Database service layer for data operations.

This module provides database operations to replace the CSV-based data storage
with SQLAlchemy database operations.
"""

import json
import logging
from datetime import datetime
from typing import List, Dict, Any, Optional
from sqlalchemy.exc import SQLAlchemyError
from models import db, User, DataPoint, DataVariable

logger = logging.getLogger('data_table_plotter')

def ensure_user_exists(user_id: str, email: str) -> User:
    """Ensure user exists in database, create if not exists.
    
    Args:
        user_id: Google user ID
        email: User's email address
        
    Returns:
        User object
    """
    try:
        user = User.query.filter_by(id=user_id).first()
        if not user:
            user = User(id=user_id, email=email)
            db.session.add(user)
            db.session.commit()
            logger.info(f'Created new user: {email}')
        return user
    except SQLAlchemyError as e:
        logger.error(f'Error ensuring user exists: {str(e)}')
        db.session.rollback()
        raise

def load_user_data(user_id: str) -> List[Dict[str, Any]]:
    """Load data from database for a specific user.
    
    Args:
        user_id: The user's ID to load data for.
        
    Returns:
        List of dictionaries containing the data, with column names as keys.
    """
    try:
        data_points = DataPoint.query.filter_by(user_id=user_id).order_by(DataPoint.date).all()
        
        result = []
        for point in data_points:
            # Parse JSON data and add date
            data_dict = json.loads(point.data)
            data_dict['Date'] = point.date.strftime('%Y-%m-%d')
            result.append(data_dict)
            
        logger.info(f'Loaded {len(result)} data points for user {user_id}')
        return result
        
    except (SQLAlchemyError, json.JSONDecodeError) as e:
        logger.error(f'Error loading data for user {user_id}: {str(e)}')
        return []

def save_user_data(user_id: str, data: List[Dict[str, Any]], reset: bool = False) -> None:
    """Save data for a specific user to database.
    
    Args:
        user_id: The user's ID to save data for.
        data: A list of dictionaries containing data points to save.
        reset: If True, clear all existing data first.
    """
    try:
        if reset:
            # Clear existing data
            DataPoint.query.filter_by(user_id=user_id).delete()
            logger.info(f'Cleared existing data for user {user_id}')
        
        if not data:
            db.session.commit()
            return
            
        # Clear existing data if not reset (replace mode)
        if not reset:
            DataPoint.query.filter_by(user_id=user_id).delete()
            
        # Save new data points
        for item in data:
            # Extract date and other data
            date_str = item.get('Date')
            if not date_str:
                continue
                
            try:
                date_obj = datetime.strptime(date_str, '%Y-%m-%d')
            except ValueError:
                logger.warning(f'Invalid date format: {date_str}')
                continue
                
            # Prepare data without date
            data_without_date = {k: v for k, v in item.items() if k != 'Date'}
            
            # Create data point
            data_point = DataPoint(
                user_id=user_id,
                date=date_obj,
                data=json.dumps(data_without_date)
            )
            db.session.add(data_point)
            
        db.session.commit()
        logger.info(f'Saved {len(data)} data points for user {user_id}')
        
    except (SQLAlchemyError, ValueError) as e:
        logger.error(f'Error saving data for user {user_id}: {str(e)}')
        db.session.rollback()
        raise

def add_data_point(user_id: str, data_point: Dict[str, Any]) -> None:
    """Add a single data point for a user.
    
    Args:
        user_id: The user's ID to add data for.
        data_point: Dictionary containing the data point to add.
    """
    try:
        date_str = data_point.get('Date')
        if not date_str:
            raise ValueError('Date is required')
            
        date_obj = datetime.strptime(date_str, '%Y-%m-%d')
        data_without_date = {k: v for k, v in data_point.items() if k != 'Date'}
        
        new_point = DataPoint(
            user_id=user_id,
            date=date_obj,
            data=json.dumps(data_without_date)
        )
        
        db.session.add(new_point)
        db.session.commit()
        logger.info(f'Added data point for user {user_id}')
        
    except (SQLAlchemyError, ValueError) as e:
        logger.error(f'Error adding data point for user {user_id}: {str(e)}')
        db.session.rollback()
        raise

def clear_user_data(user_id: str) -> None:
    """Clear all data for a specific user.
    
    Args:
        user_id: The user's ID to clear data for.
    """
    try:
        deleted_count = DataPoint.query.filter_by(user_id=user_id).delete()
        db.session.commit()
        logger.info(f'Cleared {deleted_count} data points for user {user_id}')
        
    except SQLAlchemyError as e:
        logger.error(f'Error clearing data for user {user_id}: {str(e)}')
        db.session.rollback()
        raise

def get_user_variables(user_id: str) -> List[Dict[str, Any]]:
    """Get variable definitions for a user.
    
    Args:
        user_id: The user's ID to get variables for.
        
    Returns:
        List of variable definitions.
    """
    try:
        variables = DataVariable.query.filter_by(user_id=user_id).all()
        return [
            {
                'name': var.name,
                'display_name': var.display_name,
                'data_type': var.data_type
            }
            for var in variables
        ]
    except SQLAlchemyError as e:
        logger.error(f'Error getting variables for user {user_id}: {str(e)}')
        return []
