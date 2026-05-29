import React, { useRef } from 'react';
import { Circle, Group, Rect, Text } from 'react-konva';
import Konva from 'konva';
import { CanvasNode } from '../types';

interface ShapeNodeProps {
  node: CanvasNode;
  isSelected: boolean;
  onSelect: (id: string) => void;
  onDragEnd: (id: string, x: number, y: number) => void;
}

const CANVAS_WIDTH = parseInt(import.meta.env.VITE_CANVAS_WIDTH || '800', 10);
const CANVAS_HEIGHT = parseInt(import.meta.env.VITE_CANVAS_HEIGHT || '600', 10);

export const ShapeNode: React.FC<ShapeNodeProps> = ({
  node,
  isSelected,
  onSelect,
  onDragEnd,
}) => {
  const groupRef = useRef<Konva.Group>(null);

  const handleDragEnd = (e: Konva.KonvaEventObject<DragEvent>) => {
    onDragEnd(node.id, Math.round(e.target.x()), Math.round(e.target.y()));
  };

  const getDragBounds = (pos: { x: number; y: number }) => {
    const padding = node.type === 'circle' ? (node.radius ?? 30) : 0;
    const halfW = node.type === 'rectangle' ? (node.width ?? 80) / 2 : padding;
    const halfH = node.type === 'rectangle' ? (node.height ?? 50) / 2 : padding;

    return {
      x: Math.max(halfW, Math.min(pos.x, CANVAS_WIDTH - halfW)),
      y: Math.max(halfH, Math.min(pos.y, CANVAS_HEIGHT - halfH)),
    };
  };

  const strokeColor = isSelected ? '#a5b4fc' : 'rgba(255,255,255,0.25)';
  const strokeWidth = isSelected ? 3 : 1.5;

  return (
    <Group
      ref={groupRef}
      x={node.x}
      y={node.y}
      draggable
      onClick={() => onSelect(node.id)}
      onTap={() => onSelect(node.id)}
      onDragEnd={handleDragEnd}
      dragBoundFunc={getDragBounds}
    >
      {node.type === 'circle' ? (
        <Circle
          radius={node.radius ?? 30}
          fill={node.color}
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          shadowEnabled={isSelected}
          shadowColor="#818cf8"
          shadowBlur={12}
          shadowOpacity={0.55}
        />
      ) : (
        <Rect
          width={node.width ?? 80}
          height={node.height ?? 50}
          offsetX={(node.width ?? 80) / 2}
          offsetY={(node.height ?? 50) / 2}
          fill={node.color}
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          cornerRadius={6}
          shadowEnabled={isSelected}
          shadowColor="#818cf8"
          shadowBlur={12}
          shadowOpacity={0.55}
        />
      )}
      <Text
        text={node.label.toUpperCase()}
        fontSize={13}
        fontFamily="DM Sans, system-ui, sans-serif"
        fontStyle="bold"
        fill="rgba(255,255,255,0.95)"
        align="center"
        verticalAlign="middle"
        offsetX={node.type === 'rectangle' ? 0 : node.label.length === 1 ? 4 : 8}
        offsetY={7}
        listening={false}
      />
    </Group>
  );
};
