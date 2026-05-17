import React from "react";

interface Props {
  lineWidth: number;
  color: string;
}

// Pré-visualização ao vivo da largura da linha de conexão.
// Prova-de-vida: confirma que React está montado e funcional dentro do AppV2.
export function AppearancePreview({ lineWidth, color }: Props) {
  const clampedWidth = Math.min(Math.max(lineWidth, 1), 30);

  return (
    <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "4px 0" }}>
      <svg width="80" height="24" style={{ overflow: "visible", flexShrink: 0 }}>
        <line
          x1="0" y1="12" x2="80" y2="12"
          stroke={color}
          strokeWidth={clampedWidth}
          strokeLinecap="round"
        />
      </svg>
      <span style={{ fontSize: "11px", color: "var(--color-text-light-6, #888)" }}>
        preview
      </span>
    </div>
  );
}
