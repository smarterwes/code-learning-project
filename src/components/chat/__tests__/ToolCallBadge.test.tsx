import { test, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { ToolCallBadge } from "../ToolCallBadge";
import type { ToolInvocation } from "ai";

afterEach(() => {
  cleanup();
});

function makeInvocation(
  toolName: string,
  args: Record<string, unknown>,
  state: "call" | "result" = "result",
  result: unknown = "Success"
): ToolInvocation {
  if (state === "result") {
    return { toolCallId: "id", toolName, args, state, result } as ToolInvocation;
  }
  return { toolCallId: "id", toolName, args, state } as ToolInvocation;
}

test("str_replace_editor create shows Creating filename", () => {
  render(<ToolCallBadge toolInvocation={makeInvocation("str_replace_editor", { command: "create", path: "/App.jsx" })} />);
  expect(screen.getByText("Creating App.jsx")).toBeDefined();
});

test("str_replace_editor str_replace shows Editing filename", () => {
  render(<ToolCallBadge toolInvocation={makeInvocation("str_replace_editor", { command: "str_replace", path: "/App.jsx" })} />);
  expect(screen.getByText("Editing App.jsx")).toBeDefined();
});

test("str_replace_editor insert shows Editing filename", () => {
  render(<ToolCallBadge toolInvocation={makeInvocation("str_replace_editor", { command: "insert", path: "/App.jsx" })} />);
  expect(screen.getByText("Editing App.jsx")).toBeDefined();
});

test("str_replace_editor view shows Reading filename", () => {
  render(<ToolCallBadge toolInvocation={makeInvocation("str_replace_editor", { command: "view", path: "/App.jsx" })} />);
  expect(screen.getByText("Reading App.jsx")).toBeDefined();
});

test("file_manager rename shows Renaming filename", () => {
  render(<ToolCallBadge toolInvocation={makeInvocation("file_manager", { command: "rename", path: "/App.jsx" })} />);
  expect(screen.getByText("Renaming App.jsx")).toBeDefined();
});

test("file_manager delete shows Deleting filename", () => {
  render(<ToolCallBadge toolInvocation={makeInvocation("file_manager", { command: "delete", path: "/App.jsx" })} />);
  expect(screen.getByText("Deleting App.jsx")).toBeDefined();
});

test("unknown tool falls back to tool name", () => {
  render(<ToolCallBadge toolInvocation={makeInvocation("some_tool", {})} />);
  expect(screen.getByText("some_tool")).toBeDefined();
});

test("deep path shows only basename", () => {
  render(<ToolCallBadge toolInvocation={makeInvocation("str_replace_editor", { command: "str_replace", path: "/src/components/Button.tsx" })} />);
  expect(screen.getByText("Editing Button.tsx")).toBeDefined();
});

test("state call shows spinner", () => {
  const { container } = render(
    <ToolCallBadge toolInvocation={makeInvocation("str_replace_editor", { command: "create", path: "/App.jsx" }, "call")} />
  );
  expect(container.querySelector(".animate-spin")).toBeDefined();
});

test("state result shows green dot, no spinner", () => {
  const { container } = render(
    <ToolCallBadge toolInvocation={makeInvocation("str_replace_editor", { command: "create", path: "/App.jsx" }, "result", "ok")} />
  );
  expect(container.querySelector(".animate-spin")).toBeNull();
  expect(container.querySelector(".bg-emerald-500")).toBeDefined();
});
