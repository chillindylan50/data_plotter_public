"""Database service layer for data operations.

This module provides database operations to replace the CSV-based data storage
with SQLAlchemy database operations.
"""

import json
import logging
from datetime import datetime
from typing import List, Dict, Any, Optional
from sqlalchemy.exc import SQLAlchemyError
from scipy import stats
import pandas as pd
from models import db, User, DataPoint, CorrelationResult

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


def calculate_correlations(user_id: str) -> None:
    """Calculate all correlations for a user's data and store in database.
    
    Args:
        user_id: The user's ID to calculate correlations for.
    """
    try:
        # Clear existing correlations
        CorrelationResult.query.filter_by(user_id=user_id).delete()
        
        # Load user data
        data_points = load_user_data(user_id)
        if len(data_points) < 2:
            logger.info(f'Not enough data points for correlations (user {user_id})')
            db.session.commit()
            return
        
        # Convert to DataFrame for easier processing
        df = pd.DataFrame(data_points)
        
        # Get numeric columns (excluding Date)
        numeric_columns = []
        for col in df.columns:
            if col != 'Date':
                try:
                    df[col] = pd.to_numeric(df[col], errors='coerce')
                    if not df[col].isna().all():
                        numeric_columns.append(col)
                except:
                    continue
        
        if len(numeric_columns) < 2:
            logger.info(f'Not enough numeric columns for correlations (user {user_id})')
            db.session.commit()
            return
        
        # Calculate correlations for all pairs
        for i, col_x in enumerate(numeric_columns):
            for col_y in numeric_columns[i+1:]:
                x_values = df[col_x].dropna()
                y_values = df[col_y].dropna()
                
                # Align the data (only use rows where both values exist)
                common_indices = x_values.index.intersection(y_values.index)
                if len(common_indices) < 2:
                    continue
                
                x_aligned = x_values.loc[common_indices]
                y_aligned = y_values.loc[common_indices]
                
                # Check for constant values
                if x_aligned.std() == 0 or y_aligned.std() == 0:
                    continue
                
                # Calculate correlation
                correlation, p_value = stats.pearsonr(x_aligned, y_aligned)
                
                # Determine strength and direction
                strength = get_correlation_strength(abs(correlation))
                direction = 'positive' if correlation > 0 else 'negative'
                
                # Store result
                result = CorrelationResult(
                    user_id=user_id,
                    variable_x=col_x,
                    variable_y=col_y,
                    correlation=round(correlation, 3),
                    p_value=round(p_value, 3),
                    strength=strength,
                    direction=direction
                )
                db.session.add(result)
        
        db.session.commit()
        logger.info(f'Calculated correlations for user {user_id}')
        
    except Exception as e:
        logger.error(f'Error calculating correlations for user {user_id}: {str(e)}')
        db.session.rollback()
        raise


def get_correlation_strength(abs_correlation: float) -> str:
    """Determine correlation strength from absolute correlation value.
    
    Args:
        abs_correlation: Absolute value of correlation coefficient.
        
    Returns:
        String describing correlation strength.
    """
    if abs_correlation > 0.7:
        return "strong"
    elif abs_correlation > 0.3:
        return "moderate"
    elif abs_correlation > 0.1:
        return "weak"
    else:
        return "very weak"



def get_all_correlations(user_id: str, limit: Optional[int] = None) -> List[Dict[str, Any]]:
    """Get all correlations for a user, ordered by strength.
    
    Args:
        user_id: The user's ID to get correlations for.
        limit: Optional limit on number of correlations to return.
        
    Returns:
        List of correlation dictionaries.
    """
    try:
        query = CorrelationResult.query.filter_by(user_id=user_id).order_by(
            CorrelationResult.correlation.desc()
        )
        
        if limit:
            query = query.limit(limit)
        
        correlations = query.all()
        
        return [
            {
                'variable1': corr.variable_x,
                'variable2': corr.variable_y,
                'correlation': corr.correlation,
                'p_value': corr.p_value,
                'strength': corr.strength,
                'direction': corr.direction,
                'calculated_at': corr.calculated_at.isoformat()
            }
            for corr in correlations
        ]
        
    except SQLAlchemyError as e:
        logger.error(f'Error getting all correlations for user {user_id}: {str(e)}')
        return []


def get_top_correlations(user_id: str, count: int = 3) -> List[Dict[str, Any]]:
    """Get top N correlations by absolute strength for chat context.
    
    Args:
        user_id: The user's ID to get correlations for.
        count: Number of top correlations to return.
        
    Returns:
        List of top correlation dictionaries.
    """
    try:
        # Get all correlations and sort by absolute correlation value
        correlations = CorrelationResult.query.filter_by(user_id=user_id).all()
        
        # Sort by absolute correlation value (strongest first)
        sorted_correlations = sorted(
            correlations, 
            key=lambda x: abs(x.correlation), 
            reverse=True
        )[:count]
        
        return [
            {
                'variable1': corr.variable_x,
                'variable2': corr.variable_y,
                'correlation': corr.correlation,
                'p_value': corr.p_value,
                'strength': corr.strength,
                'direction': corr.direction,
                'calculated_at': corr.calculated_at.isoformat()
            }
            for corr in sorted_correlations
        ]
        
    except SQLAlchemyError as e:
        logger.error(f'Error getting top correlations for user {user_id}: {str(e)}')
        return []
