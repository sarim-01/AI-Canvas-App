import { CanvasNode, CanvasState } from '../types';
import { loadFromFile, saveToFile } from '../persist/fileStore';

class CanvasStateManager {
  private state: CanvasState = {
    nodes: [],
    updatedAt: Date.now(),
  };

  constructor() {
    const persisted = loadFromFile();
    if (persisted) {
      this.state = persisted;
      console.log(`[State] Loaded ${persisted.nodes.length} nodes from disk`);
    }
  }

  getState(): CanvasState {
    return { ...this.state, nodes: [...this.state.nodes] };
  }

  setNodes(nodes: CanvasNode[]): void {
    this.state = { nodes, updatedAt: Date.now() };
    saveToFile(this.state);
  }

  moveNode(id: string, x: number, y: number): boolean {
    const node = this.state.nodes.find((n) => n.id === id);
    if (!node) return false;
    node.x = x;
    node.y = y;
    this.state.updatedAt = Date.now();
    saveToFile(this.state);
    return true;
  }

  clearNodes(): void {
    this.state = { nodes: [], updatedAt: Date.now() };
    saveToFile(this.state);
  }
}

export const canvasStateManager = new CanvasStateManager();
