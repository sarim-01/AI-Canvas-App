import React, { useMemo, useState } from 'react';
import { LAYOUT_SOURCE_LABELS, MAX_NODES } from '../constants';
import { useCanvasStore } from '../store/useCanvasStore';

export const LayoutToolbar: React.FC = () => {
  const { nodes, layoutSource, selectedId } = useCanvasStore();
  const [jsonOpen, setJsonOpen] = useState(false);

  const count = nodes.length;
  const atMax = count >= MAX_NODES;

  const exportPayload = useMemo(
    () => ({
      nodes,
      updatedAt: Date.now(),
    }),
    [nodes],
  );

  const jsonPreview = useMemo(() => JSON.stringify(exportPayload, null, 2), [exportPayload]);

  const handleExport = () => {
    const blob = new Blob([jsonPreview], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `canvas-layout-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (count === 0 && !layoutSource) {
    return null;
  }

  const selected = selectedId ? nodes.find((n) => n.id === selectedId) : null;

  return (
    <div className="layout-toolbar">
      <div className="layout-toolbar__row">
        <span className={`layout-toolbar__count${atMax ? ' layout-toolbar__count--max' : ''}`}>
          {count} / {MAX_NODES} shapes
        </span>
        {layoutSource && (
          <span className={`layout-toolbar__source layout-toolbar__source--${layoutSource}`}>
            {LAYOUT_SOURCE_LABELS[layoutSource]}
          </span>
        )}
        {selected && (
          <span className="layout-toolbar__selected">
            Selected: <strong>{selected.label}</strong> ({selected.type})
          </span>
        )}
        <div className="layout-toolbar__actions">
          <button
            type="button"
            className="layout-toolbar__btn"
            onClick={() => setJsonOpen((o) => !o)}
            disabled={count === 0}
          >
            {jsonOpen ? 'Hide JSON' : 'View JSON'}
          </button>
          <button
            type="button"
            className="layout-toolbar__btn layout-toolbar__btn--primary"
            onClick={handleExport}
            disabled={count === 0}
            title="Download current layout as JSON"
          >
            Export JSON
          </button>
        </div>
      </div>
      {jsonOpen && count > 0 && (
        <pre className="layout-toolbar__json" aria-label="Current canvas JSON">
          {jsonPreview}
        </pre>
      )}
    </div>
  );
};
