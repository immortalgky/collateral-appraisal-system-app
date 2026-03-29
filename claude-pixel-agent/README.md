# Claude Pixel Agent - Thousand Sunny Edition

A webapp that visualizes Claude Code agent activity in real-time using pixel art on the **Thousand Sunny** from One Piece.

Each active Claude Code session is represented by a different Straw Hat crew member who moves between stations on the ship based on what tools the agent is using. Sub-agents spawned within a session get their own crew member too!

## How It Works

```
Express server (port 3210)           React client (port 5173)
+---------------------------+  SSE   +----------------------------+
| Scans ~/.claude/projects/ | -----> | Thousand Sunny pixel scene |
| Polls ALL active .jsonl   |        | Each session = crew member |
| Detects new sessions      |        | Moving between stations    |
+---------------------------+        +----------------------------+
```

## Crew Assignment

| Session/Agent | Character | Station Mapping |
|---------------|-----------|-----------------|
| 1st session | Luffy | Captain |
| 2nd session | Zoro | First Mate |
| 3rd session | Nami | Navigator |
| Sub-agents | Sanji, Robin, Franky, Chopper, Usopp, Brook | Assigned in order |

## Ship Stations

| Station | Tools | Animation |
|---------|-------|-----------|
| Library | Read, Glob | Reading |
| Workshop | Write, Edit | Typing |
| Helm | Agent (spawn sub-crew) | Thinking |
| Main Deck | Bash | Running |
| Crow's Nest | Grep | Searching |
| Kitchen | Idle (30s no activity) | Eating |

## Quick Start

```bash
# Install dependencies
npm install

# Start both client and server
npm run dev

# Or start them separately:
npm run dev:client   # Vite on port 5173
npm run dev:server   # Express on port 3210
```

Then open http://localhost:5173 in your browser.

Start Claude Code sessions in any project, and watch the crew come alive!

## Tech Stack

- **Client:** React 19 + TypeScript + Vite + Tailwind CSS + Zustand
- **Server:** Express + Server-Sent Events (SSE)
- **Rendering:** CSS box-shadow pixel art (no images/canvas needed)
- **Data:** Polls Claude Code JSONL transcript files at `~/.claude/projects/`

## Architecture

- `server/` - Express server that scans for active Claude Code sessions and streams tool events via SSE
- `src/data/` - Pixel art sprite data for all 9 crew members and the ship
- `src/components/` - React components for the ship scene, characters, and UI
- `src/hooks/` - SSE connection and animation state management
- `src/store.ts` - Zustand store managing all agent states

## Multi-Agent Support

- **Multiple projects:** Each Claude Code session (different project) gets a unique crew member
- **Sub-agents:** When a session spawns sub-agents via the Agent tool, new crew members join the ship
- **Teammates:** Async agents are also detected and assigned crew members
- **Up to 9 concurrent agents** (full Straw Hat crew!)
