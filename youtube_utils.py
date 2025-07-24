"""
YouTube URL utilities for extracting video IDs
"""

import re
from urllib.parse import urlparse, parse_qs


def extract_video_id(url: str) -> str:
    """
    Extract YouTube video ID from various YouTube URL formats.

    Supports:
    - https://www.youtube.com/watch?v=VIDEO_ID
    - https://youtu.be/VIDEO_ID
    - https://www.youtube.com/embed/VIDEO_ID
    - https://www.youtube.com/v/VIDEO_ID
    - https://m.youtube.com/watch?v=VIDEO_ID

    Args:
        url (str): YouTube URL

    Returns:
        str: Video ID

    Raises:
        ValueError: If no valid video ID is found
    """

    # Clean the URL
    url = url.strip()

    # Remove any whitespace and ensure it starts with http
    if not url.startswith(('http://', 'https://')):
        if url.startswith('www.'):
            url = 'https://' + url
        elif url.startswith('youtube.com') or url.startswith('youtu.be'):
            url = 'https://' + url
        else:
            # Assume it's just a video ID
            if len(url) == 11 and re.match(r'^[a-zA-Z0-9_-]+$', url):
                return url
            url = 'https://www.youtube.com/watch?v=' + url

    # Parse the URL
    parsed_url = urlparse(url)

    # Extract video ID based on URL format
    if parsed_url.hostname in ['www.youtube.com', 'youtube.com', 'm.youtube.com']:
        if parsed_url.path == '/watch':
            # Standard format: https://www.youtube.com/watch?v=VIDEO_ID
            query_params = parse_qs(parsed_url.query)
            if 'v' in query_params:
                return query_params['v'][0]
        elif parsed_url.path.startswith('/embed/'):
            # Embed format: https://www.youtube.com/embed/VIDEO_ID
            return parsed_url.path.split('/embed/')[1].split('?')[0]
        elif parsed_url.path.startswith('/v/'):
            # Old format: https://www.youtube.com/v/VIDEO_ID
            return parsed_url.path.split('/v/')[1].split('?')[0]

    elif parsed_url.hostname in ['youtu.be']:
        # Short format: https://youtu.be/VIDEO_ID
        return parsed_url.path[1:].split('?')[0]

    # If no valid ID found, raise error
    raise ValueError(f"Could not extract video ID from URL: {url}")


def validate_video_id(video_id: str) -> bool:
    """
    Validate if a string is a valid YouTube video ID.

    Args:
        video_id (str): Potential video ID

    Returns:
        bool: True if valid, False otherwise
    """
    # YouTube video IDs are 11 characters long and contain letters, numbers, hyphens, and underscores
    return bool(re.match(r'^[a-zA-Z0-9_-]{11}$', video_id))


def get_video_url(video_id: str) -> str:
    """
    Generate a standard YouTube URL from a video ID.

    Args:
        video_id (str): YouTube video ID

    Returns:
        str: Standard YouTube URL
    """
    if not validate_video_id(video_id):
        raise ValueError(f"Invalid video ID: {video_id}")

    return f"https://www.youtube.com/watch?v={video_id}"


# Example usage and testing
if __name__ == "__main__":
    # Test URLs
    test_urls = [
        "https://www.youtube.com/watch?v=wjZofJX0v4M",
        "https://youtu.be/wjZofJX0v4M",
        "https://www.youtube.com/embed/wjZofJX0v4M",
        "https://m.youtube.com/watch?v=wjZofJX0v4M",
        "wjZofJX0v4M",  # Just the ID
        "youtube.com/watch?v=wjZofJX0v4M",  # Without protocol
    ]

    print("🧪 Testing YouTube URL parsing:")
    print("=" * 50)

    for url in test_urls:
        try:
            video_id = extract_video_id(url)
            print(f"✅ {url}")
            print(f"   → Video ID: {video_id}")
            print(f"   → Valid: {validate_video_id(video_id)}")
            print(f"   → Standard URL: {get_video_url(video_id)}")
        except ValueError as e:
            print(f"❌ {url}")
            print(f"   → Error: {e}")
        print("-" * 30)
