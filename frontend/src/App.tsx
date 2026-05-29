import { ActivityLogPanel } from './components/ActivityLogPanel';
import { Canvas } from './components/Canvas';
import { ConnectionStatus } from './components/ConnectionStatus';
import { PromptInput } from './components/PromptInput';
import { useSocket } from './hooks/useSocket';

function AppContent() {
  const { generateCanvas, emitMove, clearCanvasRemote } = useSocket();

  return (
    <div className="app">
      <div className="app__inner">
        <header className="app__header">
          <div className="app__brand">
            <div className="app__logo">
              <div className="app__logo-icon" aria-hidden>
                ◈
              </div>
              <h1 className="app__title">AI Canvas</h1>
            </div>
            <p className="app__subtitle">
              Describe a layout — AI generates shapes in real time across all tabs
            </p>
          </div>
          <div className="app__header-actions">
            <ActivityLogPanel />
            <ConnectionStatus />
          </div>
        </header>

        <section className="panel">
          <PromptInput onGenerate={generateCanvas} onClear={clearCanvasRemote} />
        </section>

        <section className="panel panel--canvas">
          <Canvas onNodeMove={emitMove} />
        </section>

        <p className="app__footer">
          React + Konva ↔ Node.js + Socket.io · Enter to generate · Esc to blur prompt · Open two
          tabs to test sync
        </p>
      </div>
    </div>
  );
}

export default function App() {
  return <AppContent />;
}
