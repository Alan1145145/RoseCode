import { useState, type ReactNode } from "react";
import { ClaudeMomApp } from "./claude-mom/ClaudeMomApp";
import type { ClaudeStatus, CommandResult } from "./claude-mom/model";
import "./ClaudeWorkspace.css";

/** 在主应用中复用上游管理，保留原来的增强设置入口。 */
export function ClaudeWorkspace({ children, onLocalStatus }: {
  children: ReactNode;
  onLocalStatus: (status: CommandResult<ClaudeStatus>) => void;
}) {
  const [tab, setTab] = useState<"gateway" | "enhancements">("gateway");
  const [workspaceTab, setWorkspaceTab] = useState<"upstream" | "claude">("upstream");
  return (
    <div className="claude-workspace">
      <div className="tp-tabs" role="tablist" aria-label="Claude 功能">
        <button aria-selected={tab === "gateway" && workspaceTab === "upstream"} onClick={() => { setWorkspaceTab("upstream"); setTab("gateway"); }} role="tab" type="button">上游连接</button>
        <button aria-selected={tab === "gateway" && workspaceTab === "claude"} onClick={() => { setWorkspaceTab("claude"); setTab("gateway"); }} role="tab" type="button">Claude 设置</button>
        <button aria-selected={tab === "enhancements"} onClick={() => setTab("enhancements")} role="tab" type="button">增强与供应商池</button>
      </div>
      <div className="claude-workspace-body" role="tabpanel">
        <div className="claude-workspace-gateway" hidden={tab !== "gateway"}>
          <ClaudeMomApp embedded onLocalStatus={onLocalStatus} workspaceTab={workspaceTab} onWorkspaceTabChange={setWorkspaceTab} />
        </div>
        {tab === "enhancements" ? children : null}
      </div>
    </div>
  );
}
