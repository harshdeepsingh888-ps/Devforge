import React, { useEffect, useState } from "react";
import {
  FolderKanban,
  LayoutGrid,
  List,
  Plus,
  Search,
  SlidersHorizontal,
} from "lucide-react";
import { KanbanBoard } from "../components/work-items/KanbanBoard";
import { ListView } from "../components/work-items/ListView";
import { TimelineView } from "../components/work-items/TimelineView";
import { WorkItemInspector } from "../components/work-items/WorkItemInspector";
import { useKeyboard } from "../context/KeyboardContext";
import { useWorkspace } from "../context/WorkspaceContext";
import { apiService } from "../services/api.service";
import type { WorkItem, WorkItemPriority, WorkItemStatus } from "../types/api.types";

export interface FilterState {
  status: "ACTIVE" | "ALL" | "DONE";
  assignee: string;
  priority: string;
  search: string;
}

interface WorkStreamPageProps {
  selectedItem: WorkItem | null;
  onSelectItem: (item: WorkItem | null) => void;
}

export const WorkStreamPage: React.FC<WorkStreamPageProps> = ({
  selectedItem,
  onSelectItem,
}) => {
  const { activeWorkspace, activeProject, members } = useWorkspace();
  const { setCreateModalOpen } = useKeyboard();

  const [items, setItems] = useState<WorkItem[]>([]);
  const [activeTab, setActiveTab] = useState<"BOARD" | "LIST" | "TIMELINE">("BOARD");
  const [filters, setFilters] = useState<FilterState>({
    status: "ACTIVE",
    assignee: "ALL",
    priority: "ALL",
    search: "",
  });
  const [isLoading, setIsLoading] = useState(true);

  const loadWorkItems = async () => {
    if (!activeWorkspace) return;
    try {
      setIsLoading(true);
      const list = await apiService
        .getWorkItems(activeWorkspace.id, activeProject?.id)
        .catch(() => []);
      setItems(list);
    } catch (err) {
      console.error("Failed to load work items:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadWorkItems();
  }, [activeWorkspace?.id, activeProject?.id]);

  const handleUpdateStatus = async (itemId: string, newStatus: WorkItemStatus) => {
    if (!activeWorkspace) return;

    const previousItems = [...items];
    setItems((prev) =>
      prev.map((item) =>
        item.id === itemId ? { ...item, status: newStatus } : item,
      ),
    );

    try {
      const updated = await apiService.updateWorkItemStatus(
        activeWorkspace.id,
        itemId,
        newStatus,
      );
      if (selectedItem?.id === itemId) {
        onSelectItem(updated);
      }
    } catch (err) {
      setItems(previousItems);
      console.error("Failed to update status on server:", err);
    }
  };

  const filteredItems = items.filter((item) => {
    if (filters.status === "ACTIVE" && item.status === "DONE") return false;
    if (filters.status === "DONE" && item.status !== "DONE") return false;
    if (filters.assignee !== "ALL" && item.assigneeUserId !== filters.assignee)
      return false;
    if (filters.priority !== "ALL" && item.priority !== filters.priority)
      return false;
    if (
      filters.search &&
      !item.title.toLowerCase().includes(filters.search.toLowerCase()) &&
      !item.id.toLowerCase().includes(filters.search.toLowerCase())
    ) {
      return false;
    }
    return true;
  });

  return (
    <div className="space-y-1 h-full flex flex-col font-sans text-xs">
      {/* Top Work Stream Header Bar */}
      <div className="flex items-center justify-between font-mono py-0.5 border-b border-[#161a18]">
        <div className="flex items-center gap-2">
          <span className="font-bold text-zinc-100 uppercase tracking-wider text-xs">
            WORK STREAM
          </span>
          <span className="text-[10px] text-[#6b7280]">
            {filteredItems.length}/{items.length} items
          </span>

          {/* View Projection Tabs */}
          <div className="flex items-center gap-3 ml-3">
            <button
              onClick={() => setActiveTab("BOARD")}
              className={`text-xs py-0.5 border-b-2 transition-colors font-medium ${
                activeTab === "BOARD"
                  ? "border-emerald-400 text-zinc-100 font-bold"
                  : "border-transparent text-[#6b7280] hover:text-zinc-200"
              }`}
            >
              Board
            </button>
            <button
              onClick={() => setActiveTab("LIST")}
              className={`text-xs py-0.5 border-b-2 transition-colors font-medium ${
                activeTab === "LIST"
                  ? "border-emerald-400 text-zinc-100 font-bold"
                  : "border-transparent text-[#6b7280] hover:text-zinc-200"
              }`}
            >
              List
            </button>
            <button
              onClick={() => setActiveTab("TIMELINE")}
              className={`text-xs py-0.5 border-b-2 transition-colors font-medium ${
                activeTab === "TIMELINE"
                  ? "border-emerald-400 text-zinc-100 font-bold"
                  : "border-transparent text-[#6b7280] hover:text-zinc-200"
              }`}
            >
              Timeline
            </button>
          </div>
        </div>

        {/* Keyboard Hints Right Top */}
        <div className="flex items-center gap-2.5 text-[10px] text-[#6b7280]">
          <span>
            <kbd className="px-1 py-0.2 bg-[#0e1310] border border-[#161a18] text-zinc-300">
              J
            </kbd>{" "}
            <kbd className="px-1 py-0.2 bg-[#0e1310] border border-[#161a18] text-zinc-300">
              K
            </kbd>{" "}
            move
          </span>
          <span>
            <kbd className="px-1 py-0.2 bg-[#0e1310] border border-[#161a18] text-zinc-300">
              Space
            </kbd>{" "}
            inspect
          </span>
          <button
            onClick={() => setCreateModalOpen(true)}
            className="flex items-center gap-1 hover:text-zinc-200"
          >
            <kbd className="px-1 py-0.2 bg-[#0e1310] border border-[#161a18] text-zinc-300">
              C
            </kbd>{" "}
            create
          </button>
        </div>
      </div>

      {/* Filter Toolbar Strip */}
      <div className="flex items-center justify-between py-1 px-1 bg-[#050706] border-b border-[#161a18] font-mono text-xs gap-2">
        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="flex items-center gap-1 text-[#6b7280]">
            <span className="text-[9px] uppercase text-[#6b7280]">FILTER</span>
            <select
              value={filters.status}
              onChange={(e) =>
                setFilters((prev) => ({
                  ...prev,
                  status: e.target.value as FilterState["status"],
                }))
              }
              className="bg-[#080a09] border border-[#161a18] text-zinc-200 px-1 py-0.5 text-xs focus:outline-none cursor-pointer"
            >
              <option value="ACTIVE">Active ▾</option>
              <option value="ALL">All ▾</option>
              <option value="DONE">Done ▾</option>
            </select>
          </div>

          <div className="flex items-center gap-1 text-[#6b7280]">
            <span className="text-[9px] uppercase text-[#6b7280]">ASSIGNEE</span>
            <select
              value={filters.assignee}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, assignee: e.target.value }))
              }
              className="bg-[#080a09] border border-[#161a18] text-zinc-200 px-1 py-0.5 text-xs focus:outline-none cursor-pointer"
            >
              <option value="ALL">All ▾</option>
              {members.map((m) => (
                <option key={m.userId} value={m.userId}>
                  @{m.user?.name || m.user?.email?.split("@")[0] || m.userId} ▾
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1 text-[#6b7280]">
            <span className="text-[9px] uppercase text-[#6b7280]">PRIORITY</span>
            <select
              value={filters.priority}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, priority: e.target.value }))
              }
              className="bg-[#080a09] border border-[#161a18] text-zinc-200 px-1 py-0.5 text-xs focus:outline-none cursor-pointer"
            >
              <option value="ALL">All ▾</option>
              <option value="P0">P0 ▾</option>
              <option value="P1">P1 ▾</option>
              <option value="P2">P2 ▾</option>
              <option value="P3">P3 ▾</option>
            </select>
          </div>

          <div className="relative w-44">
            <input
              type="text"
              value={filters.search}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, search: e.target.value }))
              }
              placeholder="Search this stream.."
              className="w-full bg-[#080a09] border border-[#161a18] focus:border-emerald-900/50 px-2 py-0.5 text-xs text-zinc-200 placeholder-[#6b7280] focus:outline-none"
            />
          </div>
        </div>

        <span className="text-[9px] text-[#6b7280] font-mono hidden md:inline">
          filters persist across projections
        </span>
      </div>

      {/* Main Stream Projections */}
      <div className="flex-1 overflow-hidden relative">
        {activeTab === "BOARD" && (
          <KanbanBoard
            items={filteredItems}
            selectedItem={selectedItem}
            onSelectItem={onSelectItem}
            onUpdateStatus={handleUpdateStatus}
            onCreateItem={() => setCreateModalOpen(true)}
          />
        )}

        {activeTab === "LIST" && (
          <ListView
            items={filteredItems}
            selectedItem={selectedItem}
            onSelectItem={onSelectItem}
          />
        )}

        {activeTab === "TIMELINE" && (
          <TimelineView items={filteredItems} onSelectItem={onSelectItem} />
        )}
      </div>

      {/* Slide-over WorkItem Inspector */}
      <WorkItemInspector
        item={selectedItem}
        onClose={() => onSelectItem(null)}
        onUpdateStatus={handleUpdateStatus}
      />
    </div>
  );
};
