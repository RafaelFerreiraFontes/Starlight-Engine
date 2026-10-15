import { create } from 'zustand';
import type { Hit, Transform } from '../rendering/contracts';
interface EditorUI {
  selection?: Hit;
  transient?: { target: Hit; world: Transform };
  hiddenLayers: string[];
  lockedLayers: string[];
  select: (selection?: Hit) => void;
  drag: (transient?: { target: Hit; world: Transform }) => void;
  toggleLayer: (key: 'hiddenLayers' | 'lockedLayers', id: string) => void;
}
/** UI only. No project model or preview session is persisted. */
export const useEditorUI = create<EditorUI>(set => ({
  hiddenLayers: [], lockedLayers: ['structure'],
  select: selection => set({ selection }),
  drag: transient => set({ transient }),
  toggleLayer: (key, id) => set(s => ({ [key]: s[key].includes(id) ? s[key].filter(x => x !== id) : [...s[key], id] })),
}));
