"""
MCP Client & LangGraph Adapter.
Inspects the central MCP Server and dynamically wraps its registered tools into
LangChain / LangGraph compatible StructuredTool instances.
"""

import asyncio
from typing import List, Dict, Any, Optional
from pydantic import BaseModel, create_model, Field
from langchain_core.tools import StructuredTool

from mcp_server.server import mcp_server, call_mcp_tool_sync


def _build_pydantic_schema_from_mcp(tool_name: str, input_schema: Dict[str, Any]) -> type[BaseModel]:
    """
    Dynamically creates a Pydantic model matching the MCP tool's inputSchema.
    """
    properties = input_schema.get("properties", {})
    required_fields = set(input_schema.get("required", []))
    fields = {}

    type_mapping = {
        "string": str,
        "integer": int,
        "number": float,
        "boolean": bool,
        "array": list,
        "object": dict,
    }

    for field_name, field_def in properties.items():
        field_type = type_mapping.get(field_def.get("type", "string"), str)
        desc = field_def.get("description", "")
        default_val = field_def.get("default", ...)

        if field_name not in required_fields and default_val is ...:
            default_val = None
            field_type = Optional[field_type]

        fields[field_name] = (field_type, Field(default=default_val, description=desc))

    model_name = f"{tool_name.title().replace('_', '')}Input"
    return create_model(model_name, **fields)


def get_mcp_tools() -> List[StructuredTool]:
    """
    Discovers all tools registered on the central MCP Server and converts
    them into LangGraph-compatible StructuredTool instances.
    """
    try:
        tools_list = asyncio.run(mcp_server.list_tools())
    except RuntimeError:
        # Event loop already running
        import concurrent.futures
        with concurrent.futures.ThreadPoolExecutor() as pool:
            tools_list = pool.submit(asyncio.run, mcp_server.list_tools()).result()

    langchain_tools: List[StructuredTool] = []

    for mcp_tool in tools_list:
        tool_name = mcp_tool.name
        tool_desc = mcp_tool.description or ""
        input_schema = getattr(mcp_tool, "input_schema", {}) or {}

        # Build dynamic args schema
        args_schema = _build_pydantic_schema_from_mcp(tool_name, input_schema)

        # Factory function to capture tool_name
        def make_executor(t_name: str):
            def _executor(**kwargs) -> str:
                return call_mcp_tool_sync(name=t_name, arguments=kwargs)
            return _executor

        structured_tool = StructuredTool(
            name=tool_name,
            description=tool_desc,
            args_schema=args_schema,
            func=make_executor(tool_name),
        )
        langchain_tools.append(structured_tool)

    return langchain_tools


def get_mcp_tool(name: str) -> Optional[StructuredTool]:
    """Retrieves a specific MCP tool by name."""
    for t in get_mcp_tools():
        if t.name == name:
            return t
    return None

