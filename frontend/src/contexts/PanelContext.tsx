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
 * Position override for dragged panels.
 */
interface PanelPosition {
  x: number;
  y: number;
}

/**
 * Mobile tab type for switching between story and panels view.
 */
export type MobileTab = "story" | "panels";

/**
 * Panel state managed by PanelContext.
 * Tracks active panels and local minimize state.
 */
interface PanelState {
  /** All active panels (persistent + non-persistent) */
  panels: Panel[];
  /** Panel IDs currently minimized (local-only, not persisted server-side) */
  minimized: Set<string>;
  /** Position overrides for dragged panels (local-only, not persisted) */
  positions: Map<string, PanelPosition>;
  /** Active tab on mobile view (story or panels) */
  mobileTab: MobileTab;
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
  /** Get position override for a panel (for dragged overlay panels) */
  getPanelPosition: (id: string) => PanelPosition | undefined;
  /** Update position for a panel (local-only, for drag) */
  updatePanelPosition: (id: string, x: number, y: number) => void;
  /** Current active tab on mobile (story or panels) */
  mobileTab: MobileTab;
  /** Switch the active mobile tab */
  setMobileTab: (tab: MobileTab) => void;
  /** Count of non-header panels (sidebar + overlay) for badge display */
  nonHeaderPanelCount: number;
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
    positions: new Map(),
    mobileTab: "story",
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
   * Also clears minimize and position state for the removed panel.
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

      // Remove from positions map
      const newPositions = new Map(prev.positions);
      newPositions.delete(id);

      return {
        ...prev,
        panels: prev.panels.filter((p) => p.id !== id),
        minimized: newMinimized,
        positions: newPositions,
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

  /**
   * Get position override for a panel (for dragged overlay panels).
   */
  const getPanelPosition = useCallback(
    (id: string) => {
      return state.positions.get(id);
    },
    [state.positions]
  );

  /**
   * Update position for a panel (local-only, for drag).
   */
  const updatePanelPosition = useCallback((id: string, x: number, y: number) => {
    setState((prev) => {
      const newPositions = new Map(prev.positions);
      newPositions.set(id, { x, y });
      return {
        ...prev,
        positions: newPositions,
      };
    });
  }, []);

  /**
   * Set the active mobile tab (story or panels).
   */
  const setMobileTab = useCallback((tab: MobileTab) => {
    setState((prev) => ({
      ...prev,
      mobileTab: tab,
    }));
  }, []);

  // Sort panels by createdAt for consistent stacking (REQ-F-22)
  const sortedPanels = useMemo(
    () => sortPanelsByCreatedAt(state.panels),
    [state.panels]
  );

  // Count non-header panels for mobile tab badge
  const nonHeaderPanelCount = useMemo(
    () => state.panels.filter((p) => p.position !== "header").length,
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
      getPanelPosition,
      updatePanelPosition,
      mobileTab: state.mobileTab,
      setMobileTab,
      nonHeaderPanelCount,
    }),
    [
      sortedPanels,
      state.minimized,
      addPanel,
      updatePanel,
      removePanel,
      toggleMinimize,
      isMinimized,
      getPanelPosition,
      updatePanelPosition,
      state.mobileTab,
      setMobileTab,
      nonHeaderPanelCount,
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
