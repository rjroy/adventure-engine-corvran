import { memo } from "react";
import { usePanels, type MobileTab } from "../contexts/PanelContext";
import "./MobileTabBar.css";

/**
 * Tab bar for switching between story and panels views.
 *
 * Only visible on narrower viewports (<1200px) via CSS media query.
 * Shows a badge with panel count when panels exist.
 *
 * Issue #212: Non-header panels should be 'tabs' on narrower viewports
 */
function MobileTabBarComponent() {
  const { mobileTab, setMobileTab, nonHeaderPanelCount } = usePanels();

  const handleTabChange = (tab: MobileTab) => {
    setMobileTab(tab);
  };

  return (
    <nav className="mobile-tab-bar" role="tablist" aria-label="Mobile navigation">
      <button
        type="button"
        role="tab"
        className={`mobile-tab-bar__tab ${mobileTab === "story" ? "mobile-tab-bar__tab--active" : ""}`}
        onClick={() => handleTabChange("story")}
        aria-selected={mobileTab === "story"}
        tabIndex={mobileTab === "story" ? 0 : -1}
      >
        Story
      </button>
      <button
        type="button"
        role="tab"
        className={`mobile-tab-bar__tab ${mobileTab === "panels" ? "mobile-tab-bar__tab--active" : ""}`}
        onClick={() => handleTabChange("panels")}
        aria-selected={mobileTab === "panels"}
        tabIndex={mobileTab === "panels" ? 0 : -1}
      >
        Panels
        {nonHeaderPanelCount > 0 && (
          <span className="mobile-tab-bar__badge" aria-label={`${nonHeaderPanelCount} panels`}>
            {nonHeaderPanelCount}
          </span>
        )}
      </button>
    </nav>
  );
}

export const MobileTabBar = memo(MobileTabBarComponent);
