import { useEffect } from "react";

interface KeyboardNavOptions {
  assignments: Array<{ id: string | number }>;
  focusedIndex: number;
  setFocusedIndex: (i: number) => void;
  onToggleChecked: (id: string | number) => void;
  onToggleExpand: (id: string | number) => void;
  onFocusSearch: () => void;
  onRefresh: () => void;
}

export function useKeyboardNav({
  assignments,
  focusedIndex,
  setFocusedIndex,
  onToggleChecked,
  onToggleExpand,
  onFocusSearch,
  onRefresh,
}: KeyboardNavOptions): void {
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      // Skip if user is typing in an input/textarea
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable) return;

      const len = assignments.length;
      if (len === 0) return;

      switch (e.key) {
        case "j":
        case "ArrowDown":
          e.preventDefault();
          setFocusedIndex(Math.min(focusedIndex + 1, len - 1));
          break;
        case "k":
        case "ArrowUp":
          e.preventDefault();
          setFocusedIndex(Math.max(focusedIndex - 1, 0));
          break;
        case " ":
          if (focusedIndex >= 0 && focusedIndex < len) {
            e.preventDefault();
            onToggleChecked(assignments[focusedIndex].id);
          }
          break;
        case "e":
        case "Enter":
          if (focusedIndex >= 0 && focusedIndex < len) {
            e.preventDefault();
            onToggleExpand(assignments[focusedIndex].id);
          }
          break;
        case "/":
          e.preventDefault();
          onFocusSearch();
          break;
        case "r":
          if (e.metaKey || e.ctrlKey) {
            e.preventDefault();
            onRefresh();
          }
          break;
      }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [assignments, focusedIndex, setFocusedIndex, onToggleChecked, onToggleExpand, onFocusSearch, onRefresh]);
}
