/**
 * Panel Manager Service
 *
 * Backend service for validating and managing info panel state.
 * Provides CRUD operations with validation for panel lifecycle.
 *
 * Validation rules:
 * - Maximum 5 concurrent panels (REQ-F-14)
 * - Unique panel IDs (REQ-F-15)
 * - Content size limit: 2KB / 2048 bytes (REQ-F-21)
 * - ID format: alphanumeric + hyphens, max 32 chars
 *
 * The backend is authoritative for panel state - frontend trusts incoming messages.
 */

import type { Panel, PanelPosition } from "../../../shared/protocol";

/**
 * Error messages for panel validation failures.
 * Returned to GM via tool result when operations are rejected.
 */
export const PanelErrors = {
  DUPLICATE_ID: "Panel with ID exists, use update_panel to modify",
  LIMIT_EXCEEDED: "Maximum 5 panels active",
  CONTENT_TOO_LARGE: "Content exceeds 2KB limit",
  PANEL_NOT_FOUND: "Panel ID not found",
  INVALID_ID_FORMAT:
    "Panel ID must be alphanumeric with hyphens only (max 32 chars)",
  INVALID_POSITION: "Panel position must be sidebar, header, or overlay",
} as const;

/**
 * Maximum number of concurrent panels allowed.
 */
export const MAX_PANELS = 5;

/**
 * Maximum content size in bytes (2KB).
 */
export const MAX_CONTENT_BYTES = 2048;

/**
 * Maximum ID length in characters.
 */
export const MAX_ID_LENGTH = 32;

/**
 * Regex pattern for valid panel IDs: alphanumeric and hyphens only.
 */
const ID_PATTERN = /^[a-zA-Z0-9-]+$/;

/**
 * Valid panel positions.
 */
const VALID_POSITIONS: PanelPosition[] = ["sidebar", "header", "overlay"];

/**
 * Result type for panel operations.
 * Success returns the panel or panel array.
 * Failure returns an error message string.
 */
export type PanelResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

/**
 * Input for creating a new panel.
 * Omits createdAt which is set automatically.
 */
export interface CreatePanelInput {
  id: string;
  title: string;
  content: string;
  position: PanelPosition;
  persistent: boolean;
  x?: number;
  y?: number;
}

/**
 * Input for updating an existing panel.
 */
export interface UpdatePanelInput {
  id: string;
  content: string;
}

/**
 * Panel Manager class for validating and managing panel state.
 * Tracks active panels and enforces all validation rules.
 */
export class PanelManager {
  private panels: Map<string, Panel> = new Map();

  /**
   * Validate panel ID format.
   * - Must be 1-32 characters
   * - Must contain only alphanumeric characters and hyphens
   *
   * @param id - Panel ID to validate
   * @returns Error message if invalid, null if valid
   */
  private validateId(id: string): string | null {
    if (!id || id.length === 0) {
      return PanelErrors.INVALID_ID_FORMAT;
    }
    if (id.length > MAX_ID_LENGTH) {
      return PanelErrors.INVALID_ID_FORMAT;
    }
    if (!ID_PATTERN.test(id)) {
      return PanelErrors.INVALID_ID_FORMAT;
    }
    return null;
  }

  /**
   * Validate content size using UTF-8 byte length.
   * Uses Buffer.byteLength for accurate measurement per spec.
   *
   * @param content - Content string to validate
   * @returns Error message if too large, null if valid
   */
  private validateContentSize(content: string): string | null {
    const byteLength = Buffer.byteLength(content, "utf8");
    if (byteLength > MAX_CONTENT_BYTES) {
      return PanelErrors.CONTENT_TOO_LARGE;
    }
    return null;
  }

  /**
   * Validate panel position.
   *
   * @param position - Position to validate
   * @returns Error message if invalid, null if valid
   */
  private validatePosition(position: string): string | null {
    if (!VALID_POSITIONS.includes(position as PanelPosition)) {
      return PanelErrors.INVALID_POSITION;
    }
    return null;
  }

  /**
   * Create a new info panel.
   *
   * Validates:
   * - ID format (alphanumeric + hyphens, max 32 chars)
   * - ID uniqueness (REQ-F-15)
   * - Panel count limit (REQ-F-14)
   * - Content size (REQ-F-21)
   * - Position validity
   *
   * Sets createdAt timestamp for ordering (REQ-F-22).
   *
   * @param input - Panel creation parameters
   * @returns Result with created panel or error message
   */
  create(input: CreatePanelInput): PanelResult<Panel> {
    // Validate ID format
    const idError = this.validateId(input.id);
    if (idError) {
      return { success: false, error: idError };
    }

    // Validate position
    const positionError = this.validatePosition(input.position);
    if (positionError) {
      return { success: false, error: positionError };
    }

    // Check for duplicate ID (REQ-F-15)
    if (this.panels.has(input.id)) {
      return { success: false, error: PanelErrors.DUPLICATE_ID };
    }

    // Check panel limit (REQ-F-14)
    if (this.panels.size >= MAX_PANELS) {
      return { success: false, error: PanelErrors.LIMIT_EXCEEDED };
    }

    // Validate content size (REQ-F-21)
    const contentError = this.validateContentSize(input.content);
    if (contentError) {
      return { success: false, error: contentError };
    }

    // Create panel with timestamp for ordering (REQ-F-22)
    const panel: Panel = {
      id: input.id,
      title: input.title,
      content: input.content,
      position: input.position,
      persistent: input.persistent,
      createdAt: new Date().toISOString(),
    };

    // Add optional overlay coordinates
    if (input.x !== undefined) {
      panel.x = input.x;
    }
    if (input.y !== undefined) {
      panel.y = input.y;
    }

    this.panels.set(input.id, panel);
    return { success: true, data: panel };
  }

  /**
   * Update an existing panel's content.
   *
   * Validates:
   * - ID format
   * - Panel exists (REQ-F-20)
   * - Content size (REQ-F-21)
   *
   * @param input - Panel update parameters
   * @returns Result with updated panel or error message
   */
  update(input: UpdatePanelInput): PanelResult<Panel> {
    // Validate ID format
    const idError = this.validateId(input.id);
    if (idError) {
      return { success: false, error: idError };
    }

    // Check panel exists (REQ-F-20)
    const panel = this.panels.get(input.id);
    if (!panel) {
      return { success: false, error: PanelErrors.PANEL_NOT_FOUND };
    }

    // Validate content size (REQ-F-21)
    const contentError = this.validateContentSize(input.content);
    if (contentError) {
      return { success: false, error: contentError };
    }

    // Update content only (other fields are immutable per spec)
    const updatedPanel: Panel = {
      ...panel,
      content: input.content,
    };

    this.panels.set(input.id, updatedPanel);
    return { success: true, data: updatedPanel };
  }

  /**
   * Dismiss (remove) a panel by ID.
   *
   * Validates:
   * - ID format
   * - Panel exists (REQ-F-20)
   *
   * @param id - Panel ID to dismiss
   * @returns Result with dismissed panel ID or error message
   */
  dismiss(id: string): PanelResult<{ id: string }> {
    // Validate ID format
    const idError = this.validateId(id);
    if (idError) {
      return { success: false, error: idError };
    }

    // Check panel exists (REQ-F-20)
    if (!this.panels.has(id)) {
      return { success: false, error: PanelErrors.PANEL_NOT_FOUND };
    }

    this.panels.delete(id);
    return { success: true, data: { id } };
  }

  /**
   * List all active panels.
   * Returns panels in creation order (oldest first) per REQ-F-22.
   *
   * @returns Array of all active panels sorted by createdAt
   */
  list(): Panel[] {
    const panels = Array.from(this.panels.values());
    // Sort by creation time (oldest first) for stacking order (REQ-F-22)
    return panels.sort(
      (a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
  }

  /**
   * Get all active panels as a Map.
   * Useful for bulk operations and state restoration.
   *
   * @returns Map of panel ID to Panel
   */
  getAll(): Map<string, Panel> {
    return new Map(this.panels);
  }

  /**
   * Get a single panel by ID.
   *
   * @param id - Panel ID to retrieve
   * @returns Panel if found, undefined otherwise
   */
  get(id: string): Panel | undefined {
    return this.panels.get(id);
  }

  /**
   * Get current panel count.
   *
   * @returns Number of active panels
   */
  count(): number {
    return this.panels.size;
  }

  /**
   * Clear all panels.
   * Useful for testing and session reset.
   */
  clear(): void {
    this.panels.clear();
  }

  /**
   * Get only persistent panels (for state persistence).
   * Filters out non-persistent panels per REQ-F-11, REQ-F-12.
   *
   * @returns Array of persistent panels
   */
  getPersistent(): Panel[] {
    return this.list().filter((panel) => panel.persistent);
  }

  /**
   * Restore panels from saved state.
   * Used when loading an adventure with persisted panels.
   * Validates each panel but skips limit check to allow full restoration.
   *
   * @param panels - Array of panels to restore
   * @returns Number of panels successfully restored
   */
  restore(panels: Panel[]): number {
    let restored = 0;
    for (const panel of panels) {
      // Validate ID format
      const idError = this.validateId(panel.id);
      if (idError) {
        continue;
      }

      // Validate content size
      const contentError = this.validateContentSize(panel.content);
      if (contentError) {
        continue;
      }

      // Skip duplicates
      if (this.panels.has(panel.id)) {
        continue;
      }

      // Enforce limit during restore
      if (this.panels.size >= MAX_PANELS) {
        break;
      }

      this.panels.set(panel.id, panel);
      restored++;
    }
    return restored;
  }
}
