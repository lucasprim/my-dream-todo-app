import { syncEvents, getSyncStatus, type SyncEvent } from "@/lib/vault-watcher";

export const dynamic = "force-dynamic";

export function GET() {
  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();

      const send = (event: SyncEvent) => {
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

      return () => {
        syncEvents.off("sync", send);
      };
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
