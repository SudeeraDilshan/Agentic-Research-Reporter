"""
Tavily Web Search Tool for MCP Server.
Provides real-time search with structured citations and direct answers.
"""

import os
import json
from typing import Dict, Any, List
from dotenv import load_dotenv

load_dotenv()


def _get_tavily_client():
    from tavily import TavilyClient

    api_key = os.getenv("TAVILY_API_KEY", "").strip()
    if not api_key or api_key.startswith("tvly-your"):
        raise ValueError(
            "TAVILY_API_KEY is not configured in .env. "
            "Please add your active key to .env."
        )
    return TavilyClient(api_key=api_key)


def search_web(query: str, max_results: int = 3) -> str:
    """
    Search the public web using Tavily Search API.
    
    Args:
        query: Specific search query string.
        max_results: Number of results to return (default 3).
        
    Returns:
        Formatted string containing direct answer, sources, URLs, and snippets.
    """
    try:
        client = _get_tavily_client()
        raw = client.search(
            query=query,
            max_results=max_results,
            search_depth="basic",
            include_answer=True,
        )

        lines = [f"Search Query: {query}"]
        if raw.get("answer"):
            lines.append(f"\nDirect Answer: {raw['answer']}\n")

        lines.append("Web Sources:")
        for idx, item in enumerate(raw.get("results", []), 1):
            title = item.get("title", "No Title")
            url = item.get("url", "")
            snippet = item.get("content", "").strip()
            lines.append(f"[{idx}] {title}\n    URL: {url}\n    Snippet: {snippet}\n")

        return "\n".join(lines)
    except Exception as e:
        return f"Error executing web search: {str(e)}"

