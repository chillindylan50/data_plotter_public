import pytest
from bs4 import BeautifulSoup
from urllib.parse import urlparse
from test import app  # importing your Flask app

@pytest.fixture
def client():
    app.config['TESTING'] = True
    with app.test_client() as client:
        yield client

def is_external_url(url):
    """Check if a URL points to an external domain."""
    if url.startswith('http://') or url.startswith('https://'):
        return True
    return False

def get_all_links_from_html(html_content):
    """Extract all href attributes from a and link tags in HTML content."""
    soup = BeautifulSoup(html_content, 'html.parser')
    links = []
    
    # Get all a tags with href
    for a in soup.find_all('a', href=True):
        links.append(a['href'])
    
    # Get all link tags with href (for stylesheets, etc)
    for link in soup.find_all('link', href=True):
        links.append(link['href'])
        
    return links

def is_allowed_external_domain(url):
    """Check if the external URL is from an allowed domain."""
    allowed_domains = [
        'cdnjs.cloudflare.com',  # For Font Awesome
        'dylanshah.com'          # Personal website
    ]
    parsed_url = urlparse(url)
    return any(domain in parsed_url.netloc for domain in allowed_domains)

def test_no_external_redirects_in_404_page(client):
    """Test that 404 page doesn't contain any external redirects except for allowed domains."""
    # Trigger 404 page
    response = client.get('/nonexistent-page')
    assert response.status_code == 404
    
    links = get_all_links_from_html(response.data)
    
    for link in links:
        # Check if link is external
        if is_external_url(link):
            # Verify it's an allowed domain
            if not is_allowed_external_domain(link):
                pytest.fail(f"Found unauthorized external URL in 404 page: {link}")

def test_no_external_redirects_in_routes(client):
    """Test that no route directly redirects to external URLs."""
    # Test the recycle route which uses redirect
    response = client.get('/recycle', follow_redirects=False)
    
    # If it's a redirect, check the location
    if response.status_code in [301, 302, 303, 307, 308]:
        redirect_url = response.headers['Location']
        if is_external_url(redirect_url) and not is_allowed_external_domain(redirect_url):
            pytest.fail(f"Route redirects to unauthorized external URL: {redirect_url}")

if __name__ == '__main__':
    pytest.main([__file__])
