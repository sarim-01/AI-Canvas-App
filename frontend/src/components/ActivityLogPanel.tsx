import React, { useEffect, useRef } from 'react';
import { useCanvasStore } from '../store/useCanvasStore';
import type { ActivityLogLevel } from '../types';

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

const LEVEL_CLASS: Record<ActivityLogLevel, string> = {
  info: 'activity-log__line--info',
  success: 'activity-log__line--success',
  warn: 'activity-log__line--warn',
  error: 'activity-log__line--error',
};

export const ActivityLogPanel: React.FC = () => {
  const {
    activityLogs,
    activityLogOpen,
    setActivityLogOpen,
    clearActivityLogs,
  } = useCanvasStore();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (activityLogOpen && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [activityLogs, activityLogOpen]);

  return (
    <div className="activity-log">
      <button
        type="button"
        className={`activity-log__toggle${activityLogOpen ? ' activity-log__toggle--open' : ''}`}
        onClick={() => setActivityLogOpen(!activityLogOpen)}
        aria-expanded={activityLogOpen}
        title="Live activity from client and server"
      >
        Logs
        {activityLogs.length > 0 && (
          <span className="activity-log__badge">{activityLogs.length}</span>
        )}
      </button>

      {activityLogOpen && (
        <div className="activity-log__panel panel">
          <div className="activity-log__header">
            <span className="activity-log__title">Live activity</span>
            <span className="activity-log__hint">Client + server · updates in real time</span>
            <button
              type="button"
              className="activity-log__clear"
              onClick={clearActivityLogs}
              disabled={activityLogs.length === 0}
            >
              Clear
            </button>
          </div>
          <div ref={scrollRef} className="activity-log__body" role="log" aria-live="polite">
            {activityLogs.length === 0 ? (
              <p className="activity-log__empty">
                Connect and generate a layout — server route, sync, and errors appear here.
              </p>
            ) : (
              activityLogs.map((entry) => (
                <div
                  key={entry.id}
                  className={`activity-log__line ${LEVEL_CLASS[entry.level]}`}
                >
                  <span className="activity-log__time">{formatTime(entry.ts)}</span>
                  <span className="activity-log__from">{entry.from}</span>
                  <span className="activity-log__msg">{entry.message}</span>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
