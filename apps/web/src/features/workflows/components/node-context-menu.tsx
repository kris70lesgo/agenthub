"use client";

import {
  Clipboard,
  Copy,
  Group,
  Pencil,
  ScanSearch,
  Sparkles,
  ToggleLeft,
  Trash2,
} from "lucide-react";

import type { WorkflowContextMenuState } from "@/features/workflows/types/workflow";

export interface NodeContextActions {
  duplicate: () => void;
  copy: () => void;
  paste: () => void;
  delete: () => void;
  toggleDisabled: () => void;
  rename: () => void;
  inspect: () => void;
  group: () => void;
}

export function NodeContextMenu({
  menu,
  actions,
  onClose,
}: {
  menu: WorkflowContextMenuState;
  actions: NodeContextActions;
  onClose: () => void;
}) {
  if (!menu.nodeId) return null;
  const items = [
    ["Duplicate", Copy, actions.duplicate],
    ["Copy", Clipboard, actions.copy],
    ["Paste", Clipboard, actions.paste],
    ["Rename", Pencil, actions.rename],
    ["Inspect", ScanSearch, actions.inspect],
    ["Group selected", Group, actions.group],
    ["Disable / enable", ToggleLeft, actions.toggleDisabled],
    ["Delete", Trash2, actions.delete],
  ] as const;
  return (
    <>
      <button
        aria-label="Close node context menu"
        className="fixed inset-0 z-40 cursor-default"
        onClick={onClose}
      />
      <div
        className="fixed z-50 w-52 overflow-hidden rounded-lg border border-white/15 bg-[#111614] p-1 shadow-2xl"
        role="menu"
        style={{
          left: Math.min(menu.x, window.innerWidth - 220),
          top: Math.min(menu.y, window.innerHeight - 370),
        }}
      >
        {items.map(([label, Icon, action]) => (
          <button
            className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-xs text-[var(--muted)] hover:bg-white/[.06] hover:text-white"
            key={label}
            onClick={() => {
              action();
              onClose();
            }}
            role="menuitem"
          >
            <Icon size={13} />
            {label}
          </button>
        ))}
        <div className="my-1 h-px bg-white/10" />
        <button
          className="flex w-full cursor-not-allowed items-center gap-3 rounded-md px-3 py-2 text-left text-xs text-[var(--muted)] opacity-50"
          disabled
          title="Future capability"
        >
          <Sparkles size={13} /> Publish Agent
        </button>
      </div>
    </>
  );
}
