import React, { useState } from "react";
import { LogOut, Search } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useCommandPalette } from "../../context/CommandPaletteContext";
import { useWorkspace } from "../../context/WorkspaceContext";

interface TopBarProps {
  activePage: string;
}

export const TopBar: React.FC<TopBarProps> = ({ activePage }) => {
  const { user, logout } = useAuth();
  const { activeWorkspace, activeProject } = useWorkspace();
  const { togglePalette } = useCommandPalette();
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  return (
    <header className="h-8 border-b border-[#161a18] bg-[#050706] flex items-center justify-between px-2.5 shrink-0 select-none text-xs font-mono">
      {/* Breadcrumbs */}
      <div className="flex items-center gap-1.5 text-[#6b7280]">
        <span className="text-zinc-100 font-bold uppercase tracking-wider text-[11px]">
          DEVFORGE
        </span>
        <span className="text-[#6b7280]">/</span>
        <span className="text-zinc-300">
          {activeWorkspace?.name || "Workspace"}
        </span>
        <span className="text-[#6b7280]">/</span>
        <span className="text-zinc-100 font-bold">
          {activeProject?.name || "All Projects"}
        </span>
      </div>

      {/* Global Search Bar (⌘K) */}
      <div className="flex-1 max-w-sm mx-4">
        <button
          onClick={togglePalette}
          className="w-full flex items-center justify-between px-2 py-0.5 bg-[#080a09] border border-[#161a18] hover:border-emerald-900/50 hover:shadow-emerald-subtle transition-all text-xs text-[#6b7280] font-mono group"
        >
          <div className="flex items-center gap-1.5">
            <Search className="w-3 h-3 text-[#6b7280] group-hover:text-zinc-300" />
            <span className="truncate text-xs">Search work, projects, people, actions</span>
          </div>
          <kbd className="px-1 py-0.2 text-[8px] font-mono text-[#6b7280] bg-[#0e1310] border border-[#161a18]">
            ⌘K
          </kbd>
        </button>
      </div>

      {/* Right Side: System Health & User Avatar */}
      <div className="flex items-center gap-3">
        {/* System Health Indicator */}
        <div className="flex items-center gap-1 text-[10px] font-mono text-emerald-400">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          <span>system ok</span>
        </div>

        {/* User Avatar & Name */}
        <div className="relative">
          <button
            onClick={() => setIsUserMenuOpen((prev) => !prev)}
            className="flex items-center gap-1.5 hover:opacity-80 transition-opacity font-mono text-xs text-zinc-300"
          >
            <div className="w-3.5 h-3.5 bg-[#080a09] border border-[#161a18] text-zinc-200 flex items-center justify-center font-bold text-[8px]">
              {(user?.name || "D").charAt(0).toUpperCase()}
            </div>
            <span className="text-zinc-200 font-medium text-xs">{user?.name || "dev"}</span>
          </button>

          {isUserMenuOpen && (
            <div className="absolute right-0 top-full mt-1 w-44 bg-[#080a09] border border-[#161a18] shadow-xl py-1 z-50 text-xs font-mono">
              <div className="px-2 py-1 border-b border-[#161a18]">
                <div className="font-semibold text-zinc-200 truncate">
                  {user?.name || "Developer"}
                </div>
                <div className="text-[9px] text-[#6b7280] truncate">
                  {user?.email || "dev@devforge.io"}
                </div>
              </div>
              <button
                onClick={() => {
                  setIsUserMenuOpen(false);
                  logout();
                }}
                className="flex items-center gap-2 w-full text-left px-2 py-1 text-rose-400 hover:bg-[#0b0f0d] transition-colors"
              >
                <LogOut className="w-3 h-3" />
                <span>Sign Out</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
