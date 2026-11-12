"""
MCP Server Package for Agentic Research Reporter.
Provides a centralized Model Context Protocol server, tools, and client adapters.
"""

from mcp_server.server import mcp_server, call_mcp_tool_sync
from mcp_server.client import get_mcp_tools, get_mcp_tool

__all__ = [
    "mcp_server",
    "call_mcp_tool_sync",
    "get_mcp_tools",
    "get_mcp_tool",
]

