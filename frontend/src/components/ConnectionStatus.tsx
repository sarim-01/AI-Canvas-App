import React from 'react';
import { useCanvasStore } from '../store/useCanvasStore';

export const ConnectionStatus: React.FC = () => {
  const isConnected = useCanvasStore((s) => s.isConnected);
  const serverUrl = useCanvasStore((s) => s.serverUrl);

  return (
    <div className="status-block">
      <div
        className={`status-pill ${isConnected ? 'status-pill--live' : 'status-pill--offline'}`}
        role="status"
        aria-live="polite"
      >
        <span className="status-pill__dot" />
        {isConnected ? 'Node.js connected' : 'Node.js offline'}
      </div>
      {isConnected && serverUrl && (
        <span className="status-block__url" title={serverUrl}>
          {serverUrl.replace(/^https?:\/\//, '')}
        </span>
      )}
    </div>
  );
};
