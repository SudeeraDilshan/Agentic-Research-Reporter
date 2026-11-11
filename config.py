import os
from dotenv import load_dotenv

load_dotenv() 

import sys
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8", line_buffering=True)
        sys.stderr.reconfigure(encoding="utf-8", line_buffering=True)
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
def get_llm(model: str = DEFAULT_MODEL, temperature: float = 0.0, timeout: int = 120_000):
    """
    Returns a ChatOpenRouter instance ready for LangGraph use.
    Note: langchain-openrouter expects timeout in milliseconds (120_000 ms = 120s).
    """
    from langchain_openrouter import ChatOpenRouter
    return ChatOpenRouter(
        model=model,
        temperature=temperature,
        timeout=timeout,
        max_retries=3,
        # api_key is auto-read from OPENROUTER_API_KEY env var
    )

# ── Pre-built default instance ────────────────────────────────
llm = get_llm()


def invoke_llm_with_retry(llm_instance, messages, max_retries: int = 3, initial_delay: float = 2.0):
    """
    Invokes an LLM with exponential backoff retry to withstand
    OpenRouter free tier concurrency limits or transient connection timeouts.
    """
    import time
    delay = initial_delay
    last_err = None
    for attempt in range(max_retries):
        try:
            return llm_instance.invoke(messages)
        except Exception as e:
            last_err = e
            if attempt < max_retries - 1:
                time.sleep(delay)
                delay *= 2.0
            else:
                raise last_err

if __name__ == "__main__":
    print(f"✅  Model : {DEFAULT_MODEL}")
    print("   Testing OpenRouter connection …")
    from langchain_core.messages import HumanMessage
    r = llm.invoke([HumanMessage(content="Reply with exactly: 'OpenRouter OK!'")])
    print(f"   Response: {r.content}")
