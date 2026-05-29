/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SOCKET_URL: string;
  readonly VITE_CANVAS_WIDTH: string;
  readonly VITE_CANVAS_HEIGHT: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
