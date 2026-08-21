import React, { useState } from "react";
import { AppShell } from "./components/layout/AppShell";
import { CreateWorkItemModal } from "./components/work-items/CreateWorkItemModal";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { CommandPaletteProvider } from "./context/CommandPaletteContext";
import { KeyboardProvider } from "./context/KeyboardContext";
import { WorkspaceProvider } from "./context/WorkspaceContext";
import { ActivityPage } from "./pages/ActivityPage";
import { AnalyticsPage } from "./pages/AnalyticsPage";
import { ArchitecturePage } from "./pages/ArchitecturePage";
import { CicdPage } from "./pages/CicdPage";
import { DispatchPage } from "./pages/DispatchPage";
import { EngineeringGitPage } from "./pages/EngineeringGitPage";
import { LoginPage } from "./pages/LoginPage";
import { SettingsPage } from "./pages/SettingsPage";
import { SpecsPage } from "./pages/SpecsPage";
import { WorkStreamPage } from "./pages/WorkStreamPage";
import { TraceGraph } from "./components/traceability/TraceGraph";
import type { WorkItem } from "./types/api.types";

const MainContent: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const [activePage, setActivePage] = useState("dispatch");
  const [selectedWorkItem, setSelectedWorkItem] = useState<WorkItem | null>(null);

  if (isLoading) {
    return (
      <div className="h-screen w-screen bg-[#09090b] flex items-center justify-center font-mono text-xs text-zinc-400">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-blue-500 animate-ping" />
          <span>Booting DevForge Workstation...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  const renderPage = () => {
    switch (activePage) {
      case "dispatch":
        return (
          <DispatchPage
            onSelectWorkItem={(item) => {
              setSelectedWorkItem(item);
              setActivePage("workstream");
            }}
          />
        );
      case "workstream":
        return (
          <WorkStreamPage
            selectedItem={selectedWorkItem}
            onSelectItem={setSelectedWorkItem}
          />
        );
      case "traceability":
        return (
          <div className="space-y-4 max-w-6xl mx-auto">
            <h1 className="text-lg font-bold text-zinc-100 font-mono uppercase tracking-wide">
              V3 END-TO-END TRACEABILITY
            </h1>
            <TraceGraph
              adrs={[]}
              specs={[]}
              workItems={[]}
              commits={[]}
              runs={[]}
            />
          </div>
        );
      case "architecture":
        return <ArchitecturePage />;
      case "specs":
        return <SpecsPage />;
      case "git":
        return <EngineeringGitPage />;
      case "cicd":
        return <CicdPage />;
      case "analytics":
        return <AnalyticsPage />;
      case "activity":
        return <ActivityPage />;
      case "settings":
        return <SettingsPage />;
      default:
        return (
          <DispatchPage
            onSelectWorkItem={(item) => {
              setSelectedWorkItem(item);
              setActivePage("workstream");
            }}
          />
        );
    }
  };

  return (
    <AppShell activePage={activePage} onNavigate={setActivePage}>
      {renderPage()}
      <CreateWorkItemModal onSuccess={() => setActivePage("workstream")} />
    </AppShell>
  );
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <WorkspaceProvider>
        <KeyboardProvider>
          <CommandPaletteProvider>
            <MainContent />
          </CommandPaletteProvider>
        </KeyboardProvider>
      </WorkspaceProvider>
    </AuthProvider>
  );
};

export default App;
