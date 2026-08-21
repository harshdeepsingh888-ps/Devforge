import React, { createContext, useContext, useEffect, useState } from "react";

interface KeyboardContextType {
  isCreateModalOpen: boolean;
  setCreateModalOpen: (open: boolean) => void;
  selectedItemIndex: number;
  setSelectedItemIndex: React.Dispatch<React.SetStateAction<number>>;
  onShortcut: (key: string, handler: () => void) => void;
}

const KeyboardContext = createContext<KeyboardContextType | undefined>(undefined);

export const KeyboardProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isCreateModalOpen, setCreateModalOpen] = useState<boolean>(false);
  const [selectedItemIndex, setSelectedItemIndex] = useState<number>(0);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger global single-key shortcuts when typing in inputs/textareas
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
        return;
      }

      if (e.key === "c" || e.key === "C") {
        e.preventDefault();
        setCreateModalOpen(true);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const onShortcut = (_key: string, _handler: () => void) => {
    // Custom shortcut registration handler hook helper
  };

  return (
    <KeyboardContext.Provider
      value={{
        isCreateModalOpen,
        setCreateModalOpen,
        selectedItemIndex,
        setSelectedItemIndex,
        onShortcut,
      }}
    >
      {children}
    </KeyboardContext.Provider>
  );
};

export function useKeyboard() {
  const context = useContext(KeyboardContext);
  if (!context) {
    throw new Error("useKeyboard must be used within a KeyboardProvider");
  }
  return context;
}
