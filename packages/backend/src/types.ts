import type { Hono } from "hono";
import type { ZodType } from "zod";

/** Filesystem operations interface. Production uses node:fs/promises, tests use in-memory. */
export interface FileOps {
  readDir(path: string): Promise<string[]>;
  readFile(path: string): Promise<string>;
  writeFile(path: string, content: string): Promise<void>;
  appendFile(path: string, content: string): Promise<void>;
  fileExists(path: string): Promise<boolean>;
  stat(path: string): Promise<{ mtime: Date; isDirectory: boolean } | null>;
  readFileBytes(path: string): Promise<Uint8Array>;
  deleteFile(path: string): Promise<void>;
  readFiles(path: string): Promise<string[]>;
  readDirEntries(path: string): Promise<{ name: string; type: "file" | "directory" }[]>;
  resolvePath(...segments: string[]): string;
}

export interface OperationParameter {
  name: string;
  in: "path" | "query" | "body";
  required: boolean;
  description: string;
}

export interface OperationDefinition {
  operationId: string;
  name: string;
  description: string;
  invocation: { method: string; path: string };
  requestSchema?: ZodType;
  hierarchy: { root: string; feature: string };
  parameters?: OperationParameter[];
  idempotent: boolean;
}

export interface RouteModule {
  routes: Hono;
  operations: OperationDefinition[];
}
