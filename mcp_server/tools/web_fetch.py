"""
Web Content Extractor Tool for MCP Server.
Fetches and cleans full page content/markdown from specific URLs using Tavily Extract.
"""

import os
from dotenv import load_dotenv

load_dotenv()


def _get_tavily_client():
    from tavily import TavilyClient

    api_key = os.getenv("TAVILY_API_KEY", "").strip()
    if not api_key or api_key.startswith("tvly-your"):
        raise ValueError("TAVILY_API_KEY is not configured in .env.")
    return TavilyClient(api_key=api_key)


def fetch_page_content(url: str) -> str:
    """
    Extracts the full text/markdown content of a webpage URL.
    
    Args:
        url: The web URL to inspect and read.
        
    Returns:
        Clean markdown representation of the webpage content.
    """
    try:
        client = _get_tavily_client()
        res = client.extract(urls=[url])
        results = res.get("results", [])
        if results and results[0].get("raw_content"):
            content = results[0]["raw_content"]
            # Limit length to prevent context explosion
            if len(content) > 3000:
                content = content[:3000] + "\n...[truncated]"
            return f"Page Content for {url}:\n\n{content}"
        return f"Unable to extract content from {url}."
    except Exception as e:
        return f"Error extracting page {url}: {str(e)}"

