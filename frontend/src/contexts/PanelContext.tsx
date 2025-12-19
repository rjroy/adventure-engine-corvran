import {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  type ReactNode,
} from "react";
import type { Panel } from "../../../shared/protocol";

/**
 * Panel state managed by PanelContext.
 * Tracks active panels and local minimize state.
 */
interface PanelState {
  /** All active panels (persistent + non-persistent) */
  panels: Panel[];
  /** Panel IDs currently minimized (local-only, not persisted server-side) */
  minimized: Set<string>;
}

/**
 * Context value exposed via usePanels() hook.
 */
interface PanelContextValue {
  /** All active panels, sorted by createdAt for consistent stacking (REQ-F-22) */
  panels: Panel[];
  /** Set of panel IDs currently minimized */
  minimized: Set<string>;
  /** Add a new panel to the state */
  addPanel: (panel: Panel) => void;
  /** Update an existing panel's content by ID */
  updatePanel: (id: string, content: string) => void;
  /** Remove a panel by ID */
  removePanel: (id: string) => void;
  /** Toggle minimize state for a panel (REQ-F-18: local-only) */
  toggleMinimize: (id: string) => void;
  /** Check if a specific panel is minimized */
  isMinimized: (id: string) => boolean;
}

const PanelContext = createContext<PanelContextValue | undefined>(undefined);

/**
 * Sort panels by createdAt timestamp for consistent stacking order.
 * Oldest panels appear first (bottom of stack).
 */
function sortPanelsByCreatedAt(panels: Panel[]): Panel[] {
  return [...panels].sort((a, b) => {
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  });
}

/**
 * PanelProvider component that wraps the app and manages panel state.
 * Provides centralized state for all active info panels.
 */
export function PanelProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<PanelState>({
    panels: [],
    minimized: new Set(),
  });

  /**
   * Add a new panel to the state.
   * Ignores duplicates - if panel with same ID exists, does nothing.
   */
  const addPanel = useCallback((panel: Panel) => {
    setState((prev) => {
      // Check for duplicate ID
      if (prev.panels.some((p) => p.id === panel.id)) {
        console.warn(
          `[PanelContext] Panel with ID "${panel.id}" already exists, ignoring add`
        );
        return prev;
      }

      return {
        ...prev,
        panels: [...prev.panels, panel],
      };
    });
  }, []);

  /**
   * Update an existing panel's content by ID.
   * Only content can be updated - other fields remain immutable.
   */
  const updatePanel = useCallback((id: string, content: string) => {
    setState((prev) => {
      const panelIndex = prev.panels.findIndex((p) => p.id === id);
      if (panelIndex === -1) {
        console.warn(
          `[PanelContext] Panel with ID "${id}" not found, ignoring update`
        );
        return prev;
      }

      const updatedPanels = [...prev.panels];
      updatedPanels[panelIndex] = {
        ...updatedPanels[panelIndex],
        content,
      };

      return {
        ...prev,
        panels: updatedPanels,
      };
    });
  }, []);

  /**
   * Remove a panel by ID.
   * Also clears minimize state for the removed panel.
   */
  const removePanel = useCallback((id: string) => {
    setState((prev) => {
      const panelExists = prev.panels.some((p) => p.id === id);
      if (!panelExists) {
        console.warn(
          `[PanelContext] Panel with ID "${id}" not found, ignoring remove`
        );
        return prev;
      }

      // Remove from minimized set
      const newMinimized = new Set(prev.minimized);
      newMinimized.delete(id);

      return {
        panels: prev.panels.filter((p) => p.id !== id),
        minimized: newMinimized,
      };
    });
  }, []);

  /**
   * Toggle minimize state for a panel.
   * REQ-F-18: Minimize state is local to browser session, not persisted server-side.
   */
  const toggleMinimize = useCallback((id: string) => {
    setState((prev) => {
      const panelExists = prev.panels.some((p) => p.id === id);
      if (!panelExists) {
        console.warn(
          `[PanelContext] Panel with ID "${id}" not found, ignoring toggle`
        );
        return prev;
      }

      const newMinimized = new Set(prev.minimized);
      if (newMinimized.has(id)) {
        newMinimized.delete(id);
      } else {
        newMinimized.add(id);
      }

      return {
        ...prev,
        minimized: newMinimized,
      };
    });
  }, []);

  /**
   * Check if a specific panel is minimized.
   */
  const isMinimized = useCallback(
    (id: string) => {
      return state.minimized.has(id);
    },
    [state.minimized]
  );

  // Sort panels by createdAt for consistent stacking (REQ-F-22)
  const sortedPanels = useMemo(
    () => sortPanelsByCreatedAt(state.panels),
    [state.panels]
  );

  const value: PanelContextValue = useMemo(
    () => ({
      panels: sortedPanels,
      minimized: state.minimized,
      addPanel,
      updatePanel,
      removePanel,
      toggleMinimize,
      isMinimized,
    }),
    [
      sortedPanels,
      state.minimized,
      addPanel,
      updatePanel,
      removePanel,
      toggleMinimize,
      isMinimized,
    ]
  );

  return (
    <PanelContext.Provider value={value}>{children}</PanelContext.Provider>
  );
}

/**
 * Hook to access panel context.
 * Must be used within a PanelProvider.
 */
export function usePanels(): PanelContextValue {
  const context = useContext(PanelContext);
  if (context === undefined) {
    throw new Error("usePanels must be used within a PanelProvider");
  }
  return context;
}
