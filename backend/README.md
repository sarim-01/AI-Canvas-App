# Backend

Express + Socket.io + Groq (modular monolith).

Implementation phases:

1. Types and validator (`src/types`, `src/utils/validator.ts`)
2. Canvas state + file persistence (`src/state`, `src/persist`)
3. Groq AI module (`src/ai/promptToJson.ts`)
4. Socket handlers (`src/socket/canvasHandlers.ts`)
5. Server entry (`src/index.ts`)
