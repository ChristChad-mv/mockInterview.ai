"""
You can add your unit tests here.
This is where you test your business logic, including agent functionality,
data processing, and other core components of your application.
"""

from app.agent import get_weather


def test_get_weather_san_francisco() -> None:
    """Test get_weather function returns correct weather for San Francisco."""
    result = get_weather("What's the weather in San Francisco?")
    assert result == "It's 60 degrees and foggy."


def test_get_weather_san_francisco_abbreviation() -> None:
    """Test get_weather function returns correct weather for SF abbreviation."""
    result = get_weather("weather in sf")
    assert result == "It's 60 degrees and foggy."


def test_get_weather_other_location() -> None:
    """Test get_weather function returns default weather for other locations."""
    result = get_weather("What's the weather in New York?")
    assert result == "It's 90 degrees and sunny."
