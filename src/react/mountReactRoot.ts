import { createRoot, type Root } from "react-dom/client";
import type { ReactNode } from "react";

// Reutiliza a Root existente quando o AppV2 re-renderiza o template inteiro.
const roots = new WeakMap<HTMLElement, Root>();

export function mountReactRoot(element: HTMLElement, node: ReactNode): () => void {
  let root = roots.get(element);
  if (!root) {
    root = createRoot(element);
    roots.set(element, root);
  }
  root.render(node);

  return () => {
    // Unmount síncrono via queueMicrotask para não interferir com o ciclo do AppV2.
    queueMicrotask(() => {
      root!.unmount();
      roots.delete(element);
    });
  };
}
