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

// Global singleton event emitter for sync status
export const syncEvents = new EventEmitter();
syncEvents.setMaxListeners(50);

let watcher: FSWatcher | null = null;
let currentStatus: SyncStatus = "idle";

function emitStatus(status: SyncStatus, filePath?: string, message?: string) {
  currentStatus = status;
  const event: SyncEvent = {
    status,
    filePath,
    message,
    timestamp: new Date().toISOString(),
  };
  syncEvents.emit("sync", event);
}

export function getSyncStatus(): SyncStatus {
  return currentStatus;
}

export async function startVaultWatcher(vaultDir: string): Promise<void> {
  if (watcher) return; // already started

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

  watcher = chokidar.watch(`${vaultDir}/**/*.md`, {
    ignoreInitial: true,
    persistent: true,
    awaitWriteFinish: { stabilityThreshold: 300, pollInterval: 100 },
  });

  const handleChange = async (fullPath: string) => {
    const relPath = fullPath.slice(vaultDir.length + 1).replace(/\\/g, "/");
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

  watcher
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
  if (watcher) {
    await watcher.close();
    watcher = null;
    emitStatus("idle");
  }
}
