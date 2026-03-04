"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import type { SyncStatus, SyncEvent } from "@/lib/vault-watcher";

const STATUS_STYLES: Record<SyncStatus, string> = {
  idle: "text-muted-foreground",
  watching: "text-green-500",
  reindexing: "text-yellow-500 animate-pulse",
  error: "text-destructive",
};

const STATUS_LABELS: Record<SyncStatus, string> = {
  idle: "Idle",
  watching: "Synced",
  reindexing: "Syncing…",
  error: "Sync Error",
};

export function SyncIndicator() {
  const [status, setStatus] = useState<SyncStatus>("idle");
  const [message, setMessage] = useState<string | undefined>();

  useEffect(() => {
    const es = new EventSource("/api/sync-status");

    es.onmessage = (e: MessageEvent<string>) => {
      const event = JSON.parse(e.data) as SyncEvent;
      setStatus(event.status);
      setMessage(event.filePath ?? event.message);
    };

    es.onerror = () => {
      setStatus("error");
      setMessage("Connection lost");
    };

    return () => es.close();
  }, []);

  return (
    <div
      className={cn(
        "flex items-center gap-1.5 px-3 pb-3 text-xs",
        STATUS_STYLES[status]
      )}
      title={message}
    >
      <span
        className={cn(
          "inline-block h-2 w-2 rounded-full bg-current",
          status === "reindexing" && "animate-pulse"
        )}
      />
      {STATUS_LABELS[status]}
    </div>
  );
}
