---
title: "Commission: Make commission view sidebar collapsible"
date: 2026-04-04
status: abandoned
type: one-shot
tags: [commission]
worker: Dalton
workerDisplayTitle: "Guild Artificer"
prompt: "Make the commission view sidebar collapsible, matching the pattern already used in artifacts and meetings.\n\n## The Pattern\n\n`CollapsibleSidebar` at `web/components/ui/CollapsibleSidebar.tsx` wraps sidebar content with collapse/expand behavior, persisting state to localStorage. Two views already use it:\n\n- **Artifacts**: `web/components/artifact/ArtifactDetailLayout.tsx` — wraps sidebar in `CollapsibleSidebar` with `storageKey=\"sidebar-collapsed:artifact\"`, `width={280}`, and a `desktopSidebar` CSS class\n- **Meetings**: `web/components/meeting/MeetingView.tsx` — wraps sidebar in `CollapsibleSidebar` with `storageKey=\"sidebar-collapsed:meeting\"`, `width={260}`, and a `desktopSidebar` CSS class\n\nBoth use the same responsive pattern: `CollapsibleSidebar` for desktop with a CSS class that hides it at <=768px, plus an `InlinePanel` for mobile that's hidden at >768px.\n\n## What to Change\n\n### `web/components/commission/CommissionView.tsx`\n\n1. Import `CollapsibleSidebar` from `@/web/components/ui/CollapsibleSidebar`\n2. Replace `<div className={styles.sidebar}>{sidebarContent}</div>` with:\n   ```tsx\n   <CollapsibleSidebar\n     storageKey=\"sidebar-collapsed:commission\"\n     label=\"Details\"\n     width={280}\n     className={styles.desktopSidebar}\n   >\n     {sidebarContent}\n   </CollapsibleSidebar>\n   ```\n3. The `InlinePanel` mobile sidebar at line 265-269 already exists and stays as-is.\n\n### `web/components/commission/CommissionView.module.css`\n\n1. Remove the `.sidebar` rule entirely (the `CollapsibleSidebar` component handles its own width and layout)\n2. Rename `.mobileSidebar` to stay, but update the desktop media query:\n   - Replace the `.sidebar { display: none }` rule in the 768px media query with `.desktopSidebar { display: none }`\n3. Add `.desktopSidebar` as the class that hides at mobile:\n   ```css\n   .desktopSidebar {\n     /* visible by default, hidden at mobile */\n   }\n   \n   @media (max-width: 768px) {\n     .desktopSidebar {\n       display: none;\n     }\n     .mobileSidebar {\n       display: block;\n     }\n   }\n   ```\n\nLook at how `MeetingView.module.css` handles `.desktopSidebar` for the exact pattern to follow. The commission view's CSS should match.\n\n## Verification\n\n- The commission sidebar collapses and expands on click\n- Collapsed state persists across page navigations (localStorage key `sidebar-collapsed:commission`)\n- At mobile widths (<=768px), the collapsible sidebar hides and the InlinePanel shows\n- The existing test at `tests/components/commission-view.test.tsx` still passes"
dependencies: []
linked_artifacts: []

resource_overrides:
  model: haiku

activity_timeline:
  - timestamp: 2026-04-04T14:54:40.867Z
    event: created
    reason: "Commission created"
  - timestamp: 2026-04-04T14:54:40.869Z
    event: status_dispatched
    reason: "Dispatched to worker"
    from: "pending"
    to: "dispatched"
  - timestamp: 2026-04-04T14:58:37.453Z
    event: status_cancelled
    reason: "Commission cancelled by user"
  - timestamp: 2026-04-04T14:59:24.770Z
    event: status_abandoned
    reason: "This was sent to the wrong project."
    from: "cancelled"
    to: "abandoned"
current_progress: ""
projectName: corvran
---
