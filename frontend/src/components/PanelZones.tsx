import { memo, useMemo } from "react";
import type { Panel, PanelPosition } from "../types/protocol";
import { usePanels } from "../contexts/PanelContext";
import { InfoPanel } from "./InfoPanel";
import "./PanelZones.css";

/**
 * Filter panels by position from sorted panel list.
 * Uses memoization to avoid recalculating on every render.
 */
function usePanelsByPosition(position: PanelPosition): Panel[] {
  const { panels } = usePanels();
  return useMemo(
    () => panels.filter((panel) => panel.position === position),
    [panels, position]
  );
}

/**
 * Sidebar panel zone - renders panels on the right edge in vertical stack.
 *
 * Requirements:
 * - TD-8: Right edge, vertical stack
 * - REQ-NF-2: Doesn't obscure narrative log
 * - REQ-F-22: Panels stack in creation order (oldest first/bottom)
 */
function SidebarPanelZoneComponent() {
  const sidebarPanels = usePanelsByPosition("sidebar");

  if (sidebarPanels.length === 0) {
    return null;
  }

  return (
    <aside
      className="panel-zone panel-zone--sidebar"
      data-testid="panel-zone-sidebar"
      aria-label="Sidebar panels"
    >
      {sidebarPanels.map((panel) => (
        <InfoPanel key={panel.id} panel={panel} />
      ))}
    </aside>
  );
}

/**
 * Header panel zone - renders panels at the top in horizontal flow.
 *
 * Requirements:
 * - TD-8: Top edge, horizontal flow for status tickers
 * - REQ-NF-2: Doesn't obscure narrative log
 * - REQ-F-22: Panels stack in creation order (oldest first/left)
 */
function HeaderPanelZoneComponent() {
  const headerPanels = usePanelsByPosition("header");

  if (headerPanels.length === 0) {
    return null;
  }

  return (
    <section
      className="panel-zone panel-zone--header"
      data-testid="panel-zone-header"
      aria-label="Header panels"
    >
      {headerPanels.map((panel) => (
        <InfoPanel key={panel.id} panel={panel} />
      ))}
    </section>
  );
}

/**
 * Overlay panel container - renders panels with absolute positioning.
 *
 * Requirements:
 * - TD-8: Absolute positioned, uses percentage-based x/y from panel config
 * - REQ-F-7: Overlay panels include optional x, y coordinates
 * - REQ-F-22: Panels stack in creation order (z-index by creation time)
 *
 * Note: Overlay panels use panel.x and panel.y for positioning.
 * Default to center (50%, 50%) if x/y not specified.
 */
function OverlayPanelContainerComponent() {
  const overlayPanels = usePanelsByPosition("overlay");

  if (overlayPanels.length === 0) {
    return null;
  }

  return (
    <div
      className="panel-zone panel-zone--overlay"
      data-testid="panel-zone-overlay"
      aria-label="Overlay panels"
    >
      {overlayPanels.map((panel, index) => (
        <div
          key={panel.id}
          className="panel-zone__overlay-item"
          style={{
            left: `${panel.x ?? 50}%`,
            top: `${panel.y ?? 50}%`,
            // Stack in creation order - older panels below newer ones
            zIndex: 100 + index,
          }}
        >
          <InfoPanel panel={panel} />
        </div>
      ))}
    </div>
  );
}

/**
 * Memoized zone components to prevent unnecessary re-renders.
 * Each zone only re-renders when its filtered panel list changes.
 */
export const SidebarPanelZone = memo(SidebarPanelZoneComponent);
export const HeaderPanelZone = memo(HeaderPanelZoneComponent);
export const OverlayPanelContainer = memo(OverlayPanelContainerComponent);
