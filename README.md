# AI Real-Time Canvas

Real-time collaborative canvas: users describe a layout in natural language, AI returns structured JSON (shapes + positions), React Konva renders draggable shapes, and Socket.io keeps multiple tabs in sync.

**Status:** Initial scaffold — implementation in progress.

## Tech stack

| Layer | Stack |
|-------|--------|
| Frontend | React 18, TypeScript, Vite, React Konva, Zustand, socket.io-client |
| Backend | Node.js, Express, Socket.io, TypeScript (modular monolith) |
| AI | [Groq](https://console.groq.com) — `llama-3.3-70b-versatile`, JSON-only output |

## Prerequisites

- Node.js 18+
- A free Groq API key

## Quick start

> Run steps below once backend and frontend are implemented.

### 1. Install dependencies

```bash
cd canvas-app
npm run install:all
```

### 2. Environment

Copy examples and add your Groq key:

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

Edit `backend/.env`:

```
GROQ_API_KEY=your_groq_api_key_here
PORT=3001
CANVAS_WIDTH=800
CANVAS_HEIGHT=600
FRONTEND_URL=http://localhost:5173
```

### 3. Run (two terminals)

**Backend** (port 3001):

```bash
npm run dev:backend
```

**Frontend** (port 5173):

```bash
npm run dev:frontend
```

Open http://localhost:5173 — use multiple tabs to verify real-time sync.

## Project structure

```
canvas-app/
├── backend/     # Express + Socket.io + Groq + validation + persistence
├── frontend/    # React + Konva + Zustand
└── README.md
```

## Socket events (planned)

| Event | Direction | Purpose |
|-------|-----------|---------|
| `canvas:generate` | Client → Server | Send prompt |
| `canvas:generated` | Server → All | New layout |
| `node:move` | Client → Server | Drag update |
| `node:moved` | Server → Others | Sync drag to other tabs |
| `canvas:request` | Client → Server | Request current state on connect |
| `canvas:state` | Server → Client | Current canvas snapshot |

## Constraints

- Shapes: `circle` and `rectangle` only
- Max 12 nodes per canvas
- Labels: max 2 characters
- AI returns JSON only (no code)
- All shapes stay inside the canvas bounds

## AI tool used

- **Cursor** (AI-assisted development)
- **Groq** — `llama-3.3-70b-versatile` with structured JSON output (to be wired in backend)

## What I'd improve (with more time)

- Redis-backed state for horizontal scaling
- Room-based canvases (multiple isolated boards)
- Undo/redo and conflict-free concurrent edits (CRDT)
- Automated tests (validator, sockets, components)
- Shape delete/recolor in the UI
- Stronger fallbacks when the model returns invalid JSON

## License

Private — company evaluation submission.
