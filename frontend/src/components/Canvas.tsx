import React, { useCallback } from 'react';
import { Layer, Stage } from 'react-konva';
import type Konva from 'konva';
import { useCanvasStore } from '../store/useCanvasStore';
import { LayoutToolbar } from './LayoutToolbar';
import { ShapeNode } from './ShapeNode';

const CANVAS_WIDTH = parseInt(import.meta.env.VITE_CANVAS_WIDTH || '800', 10);
const CANVAS_HEIGHT = parseInt(import.meta.env.VITE_CANVAS_HEIGHT || '600', 10);

interface CanvasProps {
  onNodeMove: (id: string, x: number, y: number) => void;
}

export const Canvas: React.FC<CanvasProps> = ({ onNodeMove }) => {
  const { nodes, canvasRevision, selectedId, setSelectedId, moveNode, appendActivityLog } =
    useCanvasStore();
  const isEmpty = nodes.length === 0;

  const handleDragEnd = useCallback(
    (id: string, x: number, y: number) => {
      moveNode(id, x, y);
      onNodeMove(id, x, y);
      appendActivityLog('info', `Shape dragged — (${Math.round(x)}, ${Math.round(y)})`);
    },
    [moveNode, onNodeMove, appendActivityLog],
  );

  const handleStageClick = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent>) => {
      if (e.target === e.target.getStage()) {
        setSelectedId(null);
      }
    },
    [setSelectedId],
  );

  return (
    <div className="canvas-panel">
      <LayoutToolbar />
      <div className="canvas-wrap">
      {isEmpty && (
        <div className="canvas-empty">
          <div className="canvas-empty__icon">◎</div>
          <p className="canvas-empty__title">Canvas ready</p>
          <p className="canvas-empty__hint">
            Enter a prompt above and hit Generate — circles and rectangles will appear here
          </p>
        </div>
      )}
      <Stage
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        onClick={handleStageClick}
        onTap={handleStageClick}
      >
        <Layer key={canvasRevision}>
          {nodes.map((node) => (
            <ShapeNode
              key={node.id}
              node={node}
              isSelected={selectedId === node.id}
              onSelect={setSelectedId}
              onDragEnd={handleDragEnd}
            />
          ))}
        </Layer>
      </Stage>
      </div>
    </div>
  );
};
