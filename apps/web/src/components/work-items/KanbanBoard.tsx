import React, { useEffect } from "react";
import { Plus } from "lucide-react";
import { WorkItemCard } from "./WorkItemCard";
import type { WorkItem, WorkItemStatus } from "../../types/api.types";

interface KanbanBoardProps {
  items: WorkItem[];
  selectedItem: WorkItem | null;
  onSelectItem: (item: WorkItem) => void;
  onUpdateStatus: (itemId: string, newStatus: WorkItemStatus) => void;
  onCreateItem: () => void;
}

const COLUMNS: { id: WorkItemStatus; label: string; wip?: string }[] = [
  { id: "BACKLOG", label: "BACKLOG" },
  { id: "READY", label: "READY" },
  { id: "IN_PROGRESS", label: "IN PROGRESS", wip: "wip 4" },
  { id: "CODE_REVIEW", label: "CODE REVIEW" },
  { id: "DONE", label: "DONE" },
];

export const KanbanBoard: React.FC<KanbanBoardProps> = ({
  items,
  selectedItem,
  onSelectItem,
  onUpdateStatus,
  onCreateItem,
}) => {
  // Keyboard J / K navigation handler matching reference image hint
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        document.activeElement?.tagName === "INPUT" ||
        document.activeElement?.tagName === "TEXTAREA" ||
        document.activeElement?.tagName === "SELECT"
      ) {
        return;
      }

      if (items.length === 0) return;

      const currentIndex = items.findIndex((i) => i.id === selectedItem?.id);

      if (e.key === "j" || e.key === "J") {
        e.preventDefault();
        const nextIndex = currentIndex < items.length - 1 ? currentIndex + 1 : 0;
        onSelectItem(items[nextIndex]);
      } else if (e.key === "k" || e.key === "K") {
        e.preventDefault();
        const prevIndex = currentIndex > 0 ? currentIndex - 1 : items.length - 1;
        onSelectItem(items[prevIndex]);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [items, selectedItem?.id, onSelectItem]);

  if (items.length === 0) {
    return (
      <div className="flex flex-col h-full font-mono">
        <div className="flex gap-1.5 h-full">
          {COLUMNS.map((col) => (
            <div
              key={col.id}
              className="flex-1 min-w-[230px] max-w-[280px] bg-[#050706] border-r border-[#161a18] flex flex-col h-full"
            >
              <div className="flex items-center justify-between px-2 py-1 border-b border-[#161a18] bg-[#050706] text-xs">
                <span className="font-bold text-[#e5e7eb] uppercase text-xs">
                  {col.label}
                </span>
                <span className="text-[10px] text-[#6b7280]">0</span>
              </div>
              <div className="flex-1 flex items-center justify-center p-4">
                <span className="text-[11px] text-[#6b7280] text-center">
                  No work items match current filters
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-1.5 overflow-x-auto pb-1.5 h-full font-mono">
      {COLUMNS.map((col) => {
        const colItems = items.filter((i) => i.status === col.id);
        return (
          <div
            key={col.id}
            className="flex-1 min-w-[230px] max-w-[280px] bg-[#050706] border-r border-[#161a18] flex flex-col h-full"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const droppedId = e.dataTransfer.getData("text/plain");
              if (droppedId) {
                onUpdateStatus(droppedId, col.id);
              }
            }}
          >
            {/* Column Header */}
            <div className="flex items-center justify-between px-2 py-1 border-b border-[#161a18] bg-[#050706] text-xs">
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-[#e5e7eb] uppercase text-xs">
                  {col.label}
                </span>
                <span className="text-[10px] text-[#6b7280]">
                  {colItems.length}
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                {col.wip && (
                  <span className="text-[9px] text-[#6b7280] font-mono">
                    {col.wip}
                  </span>
                )}
                <button
                  onClick={onCreateItem}
                  className="text-[#6b7280] hover:text-[#e5e7eb] transition-colors p-0.5"
                  title="Add Item"
                >
                  <Plus className="w-3 h-3" />
                </button>
              </div>
            </div>

            {/* Column Items */}
            <div className="flex-1 overflow-y-auto p-1 space-y-1">
              {colItems.length === 0 ? (
                <div className="h-16 border border-dashed border-[#161a18] flex items-center justify-center text-[10px] text-[#6b7280] font-mono">
                  Drop items here
                </div>
              ) : (
                colItems.map((item) => (
                  <div
                    key={item.id}
                    draggable
                    onDragStart={(e) =>
                      e.dataTransfer.setData("text/plain", item.id)
                    }
                  >
                    <WorkItemCard
                      item={item}
                      isSelected={selectedItem?.id === item.id}
                      onSelect={onSelectItem}
                    />
                  </div>
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
