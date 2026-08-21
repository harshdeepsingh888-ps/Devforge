import React from "react";
import { CommandPalette } from "../common/CommandPalette";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";
import { useWorkspace } from "../../context/WorkspaceContext";

interface AppShellProps {
  activePage: string;
  onNavigate: (page: string) => void;
  children: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({
  activePage,
  onNavigate,
  children,
}) => {
  const { activeWorkspace, activeProject } = useWorkspace();

  const projectSlug = activeProject?.name
    ? activeProject.name.toLowerCase().replace(/\s+/g, "-")
    : "core-platform";

  return (
    <div className="relative flex h-screen w-screen bg-[#050706] text-zinc-200 overflow-hidden font-sans">
      {/* Background Radial Emerald Glow */}
      <div className="absolute top-0 right-1/4 w-[500px] h-[500px] bg-emerald-950/15 rounded-full blur-3xl pointer-events-none z-0" />

      {/* Left Sidebar */}
      <Sidebar activePage={activePage} onNavigate={onNavigate} />

      {/* Main Content Area */}
      <div className="relative z-10 flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        <TopBar activePage={activePage} />
        <main className="flex-1 flex flex-col min-h-0 bg-[#050706]/80 p-2.5 overflow-hidden">
          {children}
        </main>

        {/* Bottom Application Status Footer */}
        <footer className="h-6 border-t border-[#161a18] bg-[#050706] px-3 flex items-center justify-between font-mono text-[10px] text-[#6b7280] shrink-0 select-none">
          <div className="flex items-center gap-4">
            <span>
              workspace <strong className="text-zinc-400 font-normal">{activeWorkspace?.slug || "acme"}</strong>
            </span>
            <span>
              project <strong className="text-zinc-400 font-normal">{projectSlug}</strong>
            </span>
            <span>
              role <strong className="text-zinc-400 font-normal">OWNER</strong>
            </span>
          </div>

          <div className="flex items-center gap-4">
            <span className="text-zinc-400">selected DF-142</span>
            <span className="hover:text-zinc-300 cursor-pointer">? shortcuts</span>
          </div>
        </footer>
      </div>

      {/* Global Command Palette */}
      <CommandPalette onNavigate={onNavigate} />
    </div>
  );
};
