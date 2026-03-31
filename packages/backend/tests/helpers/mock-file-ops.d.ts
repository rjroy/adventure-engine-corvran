import type { FileOps } from "../../src/types";
/**
 * In-memory FileOps for testing. Files are stored as a flat map of
 * absolute paths to contents. Directories are inferred from file paths.
 */
export type MockFileOps = FileOps & {
    getStore(): Map<string, string>;
};
export declare function createMockFileOps(files?: Record<string, string>): MockFileOps;
//# sourceMappingURL=mock-file-ops.d.ts.map