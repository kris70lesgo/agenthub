"use client";

import { GripVertical } from "lucide-react";

export function ResizeHandle({
  label,
  onResize,
  position,
}: {
  label: string;
  onResize: (deltaX: number) => void;
  position: "left" | "right";
}) {
  return (
    <button
      aria-label={label}
      className={`group relative z-20 hidden w-2 cursor-col-resize touch-none items-center justify-center border-x border-white/10 bg-[#090d0c] text-transparent transition hover:bg-white/[.04] hover:text-[var(--muted)] xl:flex ${
        position === "left"
          ? "workflow-left-handle xl:col-start-2 xl:row-start-1"
          : "workflow-right-handle xl:col-start-4 xl:row-start-1"
      }`}
      onPointerDown={(event) => {
        event.currentTarget.setPointerCapture(event.pointerId);
        let previousX = event.clientX;
        const handle = event.currentTarget;
        const move = (moveEvent: PointerEvent) => {
          const deltaX = moveEvent.clientX - previousX;
          previousX = moveEvent.clientX;
          onResize(deltaX);
        };
        const stop = () => {
          handle.removeEventListener("pointermove", move);
          handle.removeEventListener("pointerup", stop);
        };
        handle.addEventListener("pointermove", move);
        handle.addEventListener("pointerup", stop);
      }}
    >
      <GripVertical size={12} />
    </button>
  );
}
