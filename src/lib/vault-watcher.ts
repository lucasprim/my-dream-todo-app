import chokidar, { type FSWatcher } from "chokidar";
import { EventEmitter } from "events";
import { reindexFile } from "@/db/indexer";
import { fullVaultScan } from "@/db/indexer";
import { getDb } from "./db-server";

export type SyncStatus = "idle" | "watching" | "reindexing" | "error";

export interface SyncEvent {
  status: SyncStatus;
  message?: string;
  filePath?: string;
  timestamp: string;
}

// Store shared state on globalThis so it survives module reloads in Next.js dev mode.
// Each module instance (instrumentation, API routes) will share the same objects.
declare global {
  // eslint-disable-next-line no-var
  var __vaultSyncEvents: EventEmitter | undefined;
  // eslint-disable-next-line no-var
  var __vaultCurrentStatus: SyncStatus | undefined;
  // eslint-disable-next-line no-var
  var __vaultWatcher: FSWatcher | null | undefined;
}

if (!globalThis.__vaultSyncEvents) {
  globalThis.__vaultSyncEvents = new EventEmitter();
  globalThis.__vaultSyncEvents.setMaxListeners(50);
}
if (globalThis.__vaultCurrentStatus === undefined) {
  globalThis.__vaultCurrentStatus = "idle";
}
if (globalThis.__vaultWatcher === undefined) {
  globalThis.__vaultWatcher = null;
}

export const syncEvents: EventEmitter = globalThis.__vaultSyncEvents;

function emitStatus(status: SyncStatus, filePath?: string, message?: string) {
  globalThis.__vaultCurrentStatus = status;
  const event: SyncEvent = {
    status,
    filePath,
    message,
    timestamp: new Date().toISOString(),
  };
  syncEvents.emit("sync", event);
}

export function getSyncStatus(): SyncStatus {
  return globalThis.__vaultCurrentStatus ?? "idle";
}

export async function startVaultWatcher(vaultDir: string): Promise<void> {
  if (globalThis.__vaultWatcher) return; // already started

  const db = getDb();

  // Initial full scan
  try {
    emitStatus("reindexing", undefined, "Initial scan");
    await fullVaultScan(db, vaultDir);
    emitStatus("watching");
  } catch (err) {
    emitStatus("error", undefined, String(err));
    return;
  }

  globalThis.__vaultWatcher = chokidar.watch(vaultDir, {
    ignoreInitial: true,
    persistent: true,
    awaitWriteFinish: { stabilityThreshold: 300, pollInterval: 100 },
    ignored: (filePath, stats) => {
      // Skip .obsidian config dir and non-.md files
      if (filePath.includes("/.obsidian")) return true;
      return stats?.isFile() === true && !filePath.endsWith(".md");
    },
  });

  const handleChange = async (fullPath: string) => {
    const relPath = fullPath.slice(vaultDir.length + 1).replace(/\\/g, "/");
    console.log(`[vault-watcher] File changed: ${relPath}`);
    emitStatus("reindexing", relPath);
    try {
      await reindexFile(db, vaultDir, relPath);
      emitStatus("watching", relPath);
    } catch (err) {
      // Fall back to full rescan on error
      try {
        await fullVaultScan(db, vaultDir);
        emitStatus("watching");
      } catch {
        emitStatus("error", relPath, String(err));
      }
    }
  };

  globalThis.__vaultWatcher
    .on("add", handleChange)
    .on("change", handleChange)
    .on("unlink", async (fullPath) => {
      const relPath = fullPath.slice(vaultDir.length + 1).replace(/\\/g, "/");
      emitStatus("reindexing", relPath, "File deleted");
      try {
        await fullVaultScan(db, vaultDir);
        emitStatus("watching");
      } catch (err) {
        emitStatus("error", relPath, String(err));
      }
    })
    .on("error", (err) => {
      emitStatus("error", undefined, String(err));
    });

  emitStatus("watching");
}

export async function stopVaultWatcher(): Promise<void> {
  if (globalThis.__vaultWatcher) {
    await globalThis.__vaultWatcher.close();
    globalThis.__vaultWatcher = null;
    emitStatus("idle");
  }
}
