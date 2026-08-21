import React, { useEffect, useRef, useState } from "react";
import { useCommandPalette } from "../../context/CommandPaletteContext";
import { useKeyboard } from "../../context/KeyboardContext";
import { useWorkspace } from "../../context/WorkspaceContext";
import { apiService } from "../../services/api.service";
import type { Project, WorkItem } from "../../types/api.types";

interface CommandPaletteProps {
  onNavigate: (page: string) => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({ onNavigate }) => {
  const { isOpen, setIsOpen } = useCommandPalette();
  const { activeWorkspace, selectProject } = useWorkspace();
  const { setCreateModalOpen } = useKeyboard();
  const [search, setSearch] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [workItems, setWorkItems] = useState<WorkItem[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen && activeWorkspace) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setSearch("");
      setSelectedIndex(0);

      apiService
        .searchAll(activeWorkspace.id, "")
        .then((res) => {
          setWorkItems(res.workItems);
          setProjects(res.projects);
        })
        .catch(() => {});
    }
  }, [isOpen, activeWorkspace?.id]);

  if (!isOpen) return null;

  const actions = [
    {
      id: "act-create-item",
      title: "Create work item",
      shortcut: "C",
      action: () => {
        setIsOpen(false);
        setCreateModalOpen(true);
      },
    },
    {
      id: "act-workflow-state",
      title: "Change workflow state",
      shortcut: "S",
      action: () => {
        onNavigate("workstream");
        setIsOpen(false);
      },
    },
    {
      id: "act-assign",
      title: "Assign to...",
      shortcut: "A",
      action: () => {
        onNavigate("workstream");
        setIsOpen(false);
      },
    },
    {
      id: "act-link-branch",
      title: "Link branch to work item",
      action: () => {
        onNavigate("git");
        setIsOpen(false);
      },
    },
  ];

  const q = search.toLowerCase().trim();
  const filteredWork = workItems.filter(
    (item) =>
      item.title.toLowerCase().includes(q) ||
      item.id.toLowerCase().includes(q),
  );

  const filteredProjects = projects.filter(
    (proj) =>
      proj.name.toLowerCase().includes(q) ||
      proj.id.toLowerCase().includes(q),
  );

  const filteredActions = actions.filter((act) =>
    act.title.toLowerCase().includes(q),
  );

  const totalWork = filteredWork.length;
  const totalProjects = filteredProjects.length;
  const totalActions = filteredActions.length;
  const allItemsCount = totalWork + totalProjects + totalActions;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, allItemsCount));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) =>
        prev === 0 ? Math.max(0, allItemsCount - 1) : prev - 1,
      );
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (selectedIndex < totalWork) {
        onNavigate("workstream");
        setIsOpen(false);
      } else if (selectedIndex < totalWork + totalProjects) {
        const projIdx = selectedIndex - totalWork;
        if (filteredProjects[projIdx]) {
          selectProject(filteredProjects[projIdx].id);
          onNavigate("workstream");
          setIsOpen(false);
        }
      } else {
        const actionIdx = selectedIndex - totalWork - totalProjects;
        if (filteredActions[actionIdx]) {
          filteredActions[actionIdx].action();
        }
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 bg-black/85 backdrop-blur-sm animate-fade-in font-mono">
      <div
        className="w-full max-w-md bg-[#0d100e] border border-[#1c201e] shadow-[0_0_40px_rgba(16,185,129,0.15)] overflow-hidden flex flex-col relative before:absolute before:top-0 before:left-0 before:w-full before:h-[1px] before:bg-gradient-to-r before:from-transparent before:via-emerald-500/30 before:to-transparent"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Search Input */}
        <div className="flex items-center px-2.5 border-b border-[#161a18] bg-[#050706]">
          <span className="text-[#6b7280] mr-2 text-xs font-bold font-mono">&gt;</span>
          <input
            ref={inputRef}
            type="text"
            className="w-full bg-transparent py-2 text-xs text-[#e5e7eb] placeholder-[#6b7280] focus:outline-none font-mono"
            placeholder="Search work, projects, actions..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <kbd className="px-1 py-0.2 text-[9px] text-[#6b7280] bg-[#0e1310] border border-[#161a18]">
            Esc
          </kbd>
        </div>

        {/* Command Groups */}
        <div className="max-h-72 overflow-y-auto p-1 space-y-1.5 text-xs">
          {allItemsCount === 0 ? (
            <div className="py-4 text-center text-[#6b7280] text-xs">
              No matching commands, projects, or work items found.
            </div>
          ) : (
            <>
              {/* Group WORK */}
              {filteredWork.length > 0 && (
                <div>
                  <div className="px-2 py-0.5 text-[9px] uppercase tracking-wider text-[#9ca3af] font-semibold">
                    WORK
                  </div>
                  {filteredWork.map((item, idx) => {
                    const isSelected = idx === selectedIndex;
                    return (
                      <div
                        key={item.id}
                        className={`flex items-center justify-between px-2 py-1 cursor-pointer transition-all duration-150 ${
                          isSelected
                            ? "bg-emerald-500/10 border-l-2 border-emerald-500 text-emerald-400 font-semibold"
                            : "text-[#e5e7eb] hover:bg-[#0b0f0d]"
                        }`}
                        onClick={() => {
                          onNavigate("workstream");
                          setIsOpen(false);
                        }}
                        onMouseEnter={() => setSelectedIndex(idx)}
                      >
                        <span className="truncate pr-2 font-sans text-[13px]">
                          <strong className="text-emerald-400 mr-1.5 font-mono text-xs">{item.id}</strong>
                          {item.title}
                        </span>
                        <span className={`text-[11px] font-mono shrink-0 ${isSelected ? "text-emerald-400" : "text-[#6b7280]"}`}>
                          @dev
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Group PROJECTS */}
              {filteredProjects.length > 0 && (
                <div>
                  <div className="px-2 py-0.5 text-[9px] uppercase tracking-wider text-[#9ca3af] font-semibold">
                    PROJECTS
                  </div>
                  {filteredProjects.map((proj, idx) => {
                    const absoluteIdx = totalWork + idx;
                    const isSelected = absoluteIdx === selectedIndex;
                    return (
                      <div
                        key={proj.id}
                        className={`flex items-center justify-between px-2 py-1 cursor-pointer transition-all duration-150 ${
                          isSelected
                            ? "bg-emerald-500/10 border-l-2 border-emerald-500 text-emerald-400 font-semibold"
                            : "text-[#e5e7eb] hover:bg-[#0b0f0d]"
                        }`}
                        onClick={() => {
                          selectProject(proj.id);
                          onNavigate("workstream");
                          setIsOpen(false);
                        }}
                        onMouseEnter={() => setSelectedIndex(absoluteIdx)}
                      >
                        <span className="font-sans text-[13px]">{proj.name}</span>
                        <span className="text-[10px] font-mono text-[#6b7280]">Project</span>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Group ACTIONS */}
              {filteredActions.length > 0 && (
                <div>
                  <div className="px-2 py-0.5 text-[9px] uppercase tracking-wider text-[#9ca3af] font-semibold">
                    ACTIONS
                  </div>
                  {filteredActions.map((act, idx) => {
                    const absoluteIdx = totalWork + totalProjects + idx;
                    const isSelected = absoluteIdx === selectedIndex;
                    return (
                      <div
                        key={act.id}
                        className={`flex items-center justify-between px-2 py-1 cursor-pointer transition-all duration-150 ${
                          isSelected
                            ? "bg-emerald-500/10 border-l-2 border-emerald-500 text-emerald-400 font-semibold"
                            : "text-[#e5e7eb] hover:bg-[#0b0f0d]"
                        }`}
                        onClick={act.action}
                        onMouseEnter={() => setSelectedIndex(absoluteIdx)}
                      >
                        <span className="font-sans text-[13px]">{act.title}</span>
                        {act.shortcut && (
                          <kbd className="px-1 py-0.2 text-[9px] text-zinc-300 bg-[#0e1310] border border-[#161a18]">
                            {act.shortcut}
                          </kbd>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center gap-3 px-2.5 py-1 bg-[#050706] border-t border-[#161a18] text-[11px] text-[#6b7280]">
          <span><kbd className="px-1 py-0.2 bg-[#0e1310] border border-[#161a18] text-zinc-300">↑</kbd> <kbd className="px-1 py-0.2 bg-[#0e1310] border border-[#161a18] text-zinc-300">↓</kbd> navigate</span>
          <span><kbd className="px-1 py-0.2 bg-[#0e1310] border border-[#161a18] text-zinc-300">↵</kbd> run</span>
        </div>
      </div>
    </div>
  );
};
