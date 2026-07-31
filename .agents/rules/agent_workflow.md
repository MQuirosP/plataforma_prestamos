# Agent Workflow Guidelines

## End of Session Protocol ("Terminamos")

- **Trigger**: When the user explicitly states "Terminamos" (or variations like "terminamos", "Terminamos la sesión", etc.), the agent MUST immediately execute the following steps before ending the turn:
  1. Run `python -m graphify update .` to update the AST code extraction.
  2. Run `python -m graphify cluster-only .` to update the community clustering, generate the updated `graphify-out/graph.json`, regenerate the visualizer `graphify-out/graph.html`, and update the architecture report `graphify-out/GRAPH_REPORT.md`.
  3. Verify that the graph has been correctly updated without errors.
  4. Write a concise end-of-session walkthrough/summary detailing the accomplishments and the state of the graph.

## Scratch & Utility Scripts

- **Agent Workspace Cleanness**: Any one-off utility scripts (like Python scripts used for text patching or analysis) MUST NOT be left in the `frontend/` or `backend/` source directories. 
- **Designated Scratch Directory**: All temporary agent scripts must be moved to or created inside the `.agents/scratch/` directory.
- **Git Ignore**: The `.agents/scratch/` directory is intentionally ignored in `.gitignore` to prevent polluting the repository with temporary agent tools.
