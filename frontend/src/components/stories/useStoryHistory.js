import { useRef, useState } from 'react';
// Bounded immutable snapshots share unmodified image/stroke buffers.
export default function useStoryHistory(layers, strokes, setLayers, setStrokes) {
  const history = useRef([]),
    future = useRef([]),
    [, refresh] = useState(0);
  const remember = () => {
    history.current.push({
      layers,
      strokes
    });
    if (history.current.length > 20) history.current.shift();
    future.current = [];
    refresh(n => n + 1);
  };
  const restore = (source, target) => {
    const entry = source.current.pop();
    if (!entry) return;
    target.current.push({
      layers,
      strokes
    });
    setLayers(entry.layers);
    setStrokes(entry.strokes);
    refresh(n => n + 1);
  };
  return {
    history,
    remember,
    undo: () => restore(history, future),
    redo: () => restore(future, history),
    canRedo: future.current.length > 0,
    clear: () => {
      history.current = [];
      future.current = [];
    }
  };
}
