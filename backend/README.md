# Backend

Modular monolith: Express + Socket.io + AI module.

## Structure

```
src/
├── index.ts              # HTTP server + Socket.io
├── types/index.ts        # Shared types + socket event map
├── utils/validator.ts    # Sanitize nodes, validate prompt/move
├── state/canvasState.ts  # In-memory canvas + persistence hook
├── persist/fileStore.ts  # JSON file store (bonus)
├── ai/promptToJson.ts    # AI → JSON → validate
└── socket/canvasHandlers.ts
```

## Run

```bash
cp .env.example .env   # add AI_API_KEY
npm install
npm run dev
```

Health: `GET http://localhost:3001/health`  
State: `GET http://localhost:3001/state`

## Socket events

See root [README.md](../README.md#socket-events) for the full event table.

## Persistence

At runtime, writes `data/canvas.json` on generate and move (`data/` is gitignored).

Committed JSON **samples** for reviewers: [`examples/`](./examples/) (not runtime data).
