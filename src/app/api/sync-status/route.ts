import { syncEvents, getSyncStatus, type SyncEvent } from "@/lib/vault-watcher";

export const dynamic = "force-dynamic";

export function GET() {
  const encoder = new TextEncoder();
  let send: ((event: SyncEvent) => void) | null = null;

  const stream = new ReadableStream({
    start(controller) {
      send = (event: SyncEvent) => {
        const data = `data: ${JSON.stringify(event)}\n\n`;
        try {
          controller.enqueue(encoder.encode(data));
        } catch {
          // Client disconnected
        }
      };

      // Send current status immediately
      send({
        status: getSyncStatus(),
        timestamp: new Date().toISOString(),
      });

      syncEvents.on("sync", send);
    },
    cancel() {
      if (send) {
        syncEvents.off("sync", send);
        send = null;
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
