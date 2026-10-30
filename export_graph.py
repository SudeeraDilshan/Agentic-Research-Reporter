"""
Export the graph visualizations for project_multi_agent.
Generates:
  1. assets/project_multi_agent_combined.png  (Main Graph & Report Subgraph combined — used in README)
  2. assets/project_multi_agent_graph.png     (Main graph only)
  3. assets/report_subgraph.png               (Report writing pipeline subgraph only)
"""

import os
from langgraph.graph import StateGraph, START, END
from project_multi_agent import (
    app,
    report_subgraph,
    MainState,
    supervisor_node,
    dispatch_workers,
    research_worker,
    human_approval_node,
    approval_router,
)

# All images are saved into the assets/ folder
ASSETS_DIR = "assets"
os.makedirs(ASSETS_DIR, exist_ok=True)


def export_combined_graph():
    """Generates a combined graph with Main Graph and Report Subgraph nested together."""
    out = os.path.join(ASSETS_DIR, "project_multi_agent_combined.png")
    print(f"Generating {out}...")

    # Rebuild with report_subgraph as a compiled node so xray=1 expands it inline
    combined_builder = StateGraph(MainState)
    combined_builder.add_node("supervisor", supervisor_node)
    combined_builder.add_node("research_worker", research_worker)
    combined_builder.add_node("human_approval", human_approval_node)
    combined_builder.add_node("report_pipeline", report_subgraph)

    combined_builder.add_edge(START, "supervisor")
    combined_builder.add_conditional_edges("supervisor", dispatch_workers, ["research_worker"])
    combined_builder.add_edge("research_worker", "human_approval")
    combined_builder.add_conditional_edges(
        "human_approval",
        approval_router,
        {"report_pipeline": "report_pipeline", END: END},
    )
    combined_builder.add_edge("report_pipeline", END)

    compiled_combined = combined_builder.compile()
    combined_png = compiled_combined.get_graph(xray=1).draw_mermaid_png()

    with open(out, "wb") as f:
        f.write(combined_png)
    print(f" Saved: {out}")


def export_individual_graphs():
    """Exports individual graphs for the main graph and the report subgraph."""
    main_out = os.path.join(ASSETS_DIR, "project_multi_agent_graph.png")
    print(f"Generating {main_out}...")
    main_png = app.get_graph().draw_mermaid_png()
    with open(main_out, "wb") as f:
        f.write(main_png)
    print(f" Saved: {main_out}")

    sub_out = os.path.join(ASSETS_DIR, "report_subgraph.png")
    print(f"Generating {sub_out}...")
    subgraph_png = report_subgraph.get_graph().draw_mermaid_png()
    with open(sub_out, "wb") as f:
        f.write(subgraph_png)
    print(f" Saved: {sub_out}")


def save_graphs():
    export_combined_graph()
    export_individual_graphs()


if __name__ == "__main__":
    save_graphs()
