"""
Academic Research Search Tool for MCP Server.
Specializes in searching peer-reviewed literature, preprints (arXiv), and technical reports.
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


def search_academic_papers(topic: str, max_results: int = 3) -> str:
    """
    Search academic repositories, papers, and preprint servers (arXiv, Nature, IEEE, ACM).
    
    Args:
        topic: The scientific or technical topic to search.
        max_results: Max papers to return (default: 3).
        
    Returns:
        Formatted academic paper titles, abstracts/snippets, and links.
    """
    try:
        client = _get_tavily_client()
        query = f"academic paper research site:arxiv.org OR site:nature.com OR site:semanticscholar.org {topic}"
        raw = client.search(
            query=query,
            max_results=max_results,
            search_depth="advanced",
            include_answer=False,
        )

        lines = [f"Academic Paper Search: {topic}\n"]
        for idx, item in enumerate(raw.get("results", []), 1):
            title = item.get("title", "Untitled Paper")
            url = item.get("url", "")
            snippet = item.get("content", "").strip()
            lines.append(f"[{idx}] {title}\n    Paper Link: {url}\n    Abstract/Summary: {snippet}\n")

        return "\n".join(lines)
    except Exception as e:
        return f"Error executing academic search: {str(e)}"

