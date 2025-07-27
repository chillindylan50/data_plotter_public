# Test the Flask app backend.
import pytest
import sys
import os
import json
import tempfile
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import app

# # Sample test data that matches the actual data structure
SAMPLE_DATA = [
    {
        "date": "2025-03-07",
        "x": 0,
        "y": 0
    },
    {
        "date": "2025-03-06",
        "x": 1,
        "y": 2
    },
    {
        "date": "2025-03-07",
        "x": 23,
        "y": 34
    },
    {
        "date": "2025-03-11",
        "x": 2,
        "y": 3
    },
    {
        "date": "2025-03-19",
        "x": 234,
        "y": 1
    }
]

@pytest.fixture
def client():
    app.config['TESTING'] = True
    with app.test_client() as client:
        yield client

# def test_load_data(tmp_path):
#     """Test the load_data function with a temporary test file"""
#     # Save test data to a temporary file
#     original_data_path = DATA_FILE_PATH
#     temp_file = tmp_path / "test_data.json"
#     with open(temp_file, 'w') as f:
#         json.dump(SAMPLE_DATA, f)
    
#     # Temporarily replace DATA_FILE_PATH
#     import app
#     app.DATA_FILE_PATH = str(temp_file)
    
#     # Test loading data
#     loaded_data = load_data()
#     assert len(loaded_data) == 5
#     assert loaded_data[0]["date"] == "2025-03-07"
#     assert loaded_data[0]["x"] == 0
#     assert loaded_data[0]["y"] == 0
    
#     # Reset DATA_FILE_PATH
#     app.DATA_FILE_PATH = original_data_path

def test_correlation(client):
    """Test the calculate_correlation endpoint with actual data structure"""
    # Test correlation between x and y
    test_data = {
        'x_values': [str(row["x"]) for row in SAMPLE_DATA],
        'y_values': [str(row["y"]) for row in SAMPLE_DATA],
        'xAxis': "x",
        'yAxis': "y",
        'columnTitles': {
            "x": "X Value",
            "y": "Y Value"
        }
    }
    
    response = client.post('/calculate_correlation', 
                         json=test_data,
                         content_type='application/json')
    
    assert response.status_code == 200
    data = json.loads(response.data)
    assert 'correlation' in data
    # We expect some correlation between x and y in the sample data
    assert isinstance(data['correlation'], float)

def test_correlation_error_handling(client):
    """Test error handling in correlation calculation"""
    # Test with non-numeric data
    test_data = {
        'x_values': ["0", "invalid", "23", "2", "234"],
        'y_values': ["0", "2", "34", "3", "1"],
        'xAxis': "x",
        'yAxis': "y",
        'columnTitles': {
            "x": "X Value",
            "y": "Y Value"
        }
    }
    
    response = client.post('/calculate_correlation', 
                         json=test_data,
                         content_type='application/json')
    
    assert response.status_code == 400
    data = json.loads(response.data)
    assert 'error' in data
    assert 'numeric' in data['error']
