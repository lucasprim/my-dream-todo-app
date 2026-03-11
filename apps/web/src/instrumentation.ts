export async function register() {
  console.log(`[instrumentation] register() called, NEXT_RUNTIME=${process.env.NEXT_RUNTIME}`);
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { startVaultWatcher } = await import("./lib/vault-watcher");
    const { getVaultDir } = await import("./lib/db-server");
    const vaultDir = getVaultDir();
    console.log(`[instrumentation] Starting vault watcher for: ${vaultDir}`);
    await startVaultWatcher(vaultDir);
    console.log(`[instrumentation] Vault watcher started`);
  }
}
