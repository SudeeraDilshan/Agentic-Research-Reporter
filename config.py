import os
from dotenv import load_dotenv

load_dotenv() 

import sys
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass

# ── Validate key ──────────────────────────────────────────────
_key = os.getenv("OPENROUTER_API_KEY", "")
if not _key or _key.startswith("sk-or-v1-your"):
    raise EnvironmentError(
        "\n\n[!] OPENROUTER_API_KEY not configured!\n"
        "   Steps to fix:\n"
        "   1. Copy .env.example -> .env\n"
        "   2. Paste your key from https://openrouter.ai/keys\n"
        "   3. Re-run the script.\n"
    )

# ── Default model ─────────────────────────────────────────────
# Change DEFAULT_MODEL in .env to switch models across all files
DEFAULT_MODEL = os.getenv("DEFAULT_MODEL", "nvidia/nemotron-3.5-lightning:free")

# ── LLM factory ───────────────────────────────────────────────
def get_llm(model: str = DEFAULT_MODEL, temperature: float = 0.0):
    """
    Returns a ChatOpenRouter instance ready for LangGraph use.

    Examples:
        from config import get_llm
        llm = get_llm()
        llm = get_llm("anthropic/claude-3.5-sonnet")
        llm = get_llm(temperature=0.7)
    """
    from langchain_openrouter import ChatOpenRouter
    return ChatOpenRouter(
        model=model,
        temperature=temperature,
        # api_key is auto-read from OPENROUTER_API_KEY env var
    )

# ── Pre-built default instance ────────────────────────────────
llm = get_llm()

if __name__ == "__main__":
    print(f"✅  Model : {DEFAULT_MODEL}")
    print("   Testing OpenRouter connection …")
    from langchain_core.messages import HumanMessage
    r = llm.invoke([HumanMessage(content="Reply with exactly: 'OpenRouter OK!'")])
    print(f"   Response: {r.content}")
