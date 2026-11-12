"""
Central Model Context Protocol (MCP) Server.
Hosts all agent research tools conforming to Anthropic's Model Context Protocol.

Can be run:
  1. In-process: imported by LangGraph agents via mcp_server.client
  2. Standalone stdio: `python -m mcp_server.server` for Claude Desktop / Cursor / Antigravity
"""

import sys
import asyncio
from typing import Dict, Any, List

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8", line_buffering=True)
        sys.stderr.reconfigure(encoding="utf-8", line_buffering=True)
    except Exception:
        pass

from mcp.server.mcpserver import MCPServer
from mcp.types import TextContent

from mcp_server.tools.tavily_search import search_web
from mcp_server.tools.web_fetch import fetch_page_content
from mcp_server.tools.academic_search import search_academic_papers

# Initialize the central MCP Server
mcp_server = MCPServer(name="agent-research-server")


# ── Register Tools on MCP Server ───────────────────────────────

@mcp_server.tool(
    name="tavily_search",
    description=(
        "Search the live web for recent news, facts, and developments. "
        "Returns titles, URLs, and relevant content snippets with direct answers."
    ),
)
def tool_tavily_search(query: str, max_results: int = 3) -> str:
    """Search the web for real-time information."""
    return search_web(query=query, max_results=max_results)


@mcp_server.tool(
    name="fetch_page_content",
    description=(
        "Fetch and read the full text/markdown content of a specific webpage URL "
        "for deep investigation."
    ),
)
def tool_fetch_page_content(url: str) -> str:
    """Fetch full webpage content."""
    return fetch_page_content(url=url)


@mcp_server.tool(
    name="search_academic_papers",
    description=(
        "Search academic publications, preprint archives (arXiv), and research papers "
        "for scientific rigor."
    ),
)
def tool_search_academic_papers(topic: str, max_results: int = 3) -> str:
    """Search academic repositories for scholarly literature."""
    return search_academic_papers(topic=topic, max_results=max_results)


# ── Direct In-Process Helper ───────────────────────────────────

def call_mcp_tool_sync(name: str, arguments: Dict[str, Any]) -> str:
    """
    Synchronous helper to execute an MCP tool in-process,
    returning the string content of the MCP TextContent result.
    """
    async def _invoke():
        res = await mcp_server.call_tool(name=name, arguments=arguments)
        texts = []
        for content in getattr(res, "content", []):
            if isinstance(content, TextContent):
                texts.append(content.text)
            elif hasattr(content, "text"):
                texts.append(content.text)
        return "\n\n".join(texts)

    try:
        loop = asyncio.get_event_loop()
        if loop.is_running():
            # If already inside an existing event loop (e.g. Jupyter or async LangGraph)
            import concurrent.futures
            with concurrent.futures.ThreadPoolExecutor() as pool:
                return pool.submit(asyncio.run, _invoke()).result()
        else:
            return loop.run_until_complete(_invoke())
    except RuntimeError:
        return asyncio.run(_invoke())


# ── Standalone CLI Runner ──────────────────────────────────────

async def main():
    print(f"🚀 Starting MCP Server '{mcp_server.name}' via stdio...")
    tools = await mcp_server.list_tools()
    print(f"   Registered {len(tools)} MCP Tools:")
    for t in tools:
        print(f"   • {t.name}: {t.description[:60]}...")
    # Run stdio transport
    await mcp_server.run_stdio_async()


if __name__ == "__main__":
    asyncio.run(main())

