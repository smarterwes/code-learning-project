"use client";

import { ToolInvocation } from "ai";
import { Loader2 } from "lucide-react";

interface ToolCallBadgeProps {
  toolInvocation: ToolInvocation;
}

function getLabel(toolName: string, args: Record<string, unknown>): string {
  const path = typeof args.path === "string" ? args.path : undefined;
  const basename = path ? path.split("/").filter(Boolean).at(-1) ?? path : undefined;
  const filePart = basename ? ` ${basename}` : "";

  if (toolName === "str_replace_editor") {
    switch (args.command) {
      case "create":
        return `Creating${filePart}`;
      case "str_replace":
      case "insert":
        return `Editing${filePart}`;
      case "view":
        return `Reading${filePart}`;
      case "undo_edit":
        return `Reverting${filePart}`;
    }
  }

  if (toolName === "file_manager") {
    switch (args.command) {
      case "rename":
        return `Renaming${filePart}`;
      case "delete":
        return `Deleting${filePart}`;
    }
  }

  return toolName;
}

export function ToolCallBadge({ toolInvocation }: ToolCallBadgeProps) {
  const args = (toolInvocation.args ?? {}) as Record<string, unknown>;
  const label = getLabel(toolInvocation.toolName, args);
  const isDone = toolInvocation.state === "result" && "result" in toolInvocation && toolInvocation.result;

  return (
    <div className="inline-flex items-center gap-2 mt-2 px-3 py-1.5 bg-neutral-50 rounded-lg text-xs font-mono border border-neutral-200">
      {isDone ? (
        <>
          <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
          <span className="text-neutral-700">{label}</span>
        </>
      ) : (
        <>
          <Loader2 className="w-3 h-3 animate-spin text-blue-600" />
          <span className="text-neutral-700">{label}</span>
        </>
      )}
    </div>
  );
}
