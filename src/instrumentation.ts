export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { startVaultWatcher } = await import("./lib/vault-watcher");
    const vaultDir = process.env.VAULT_DIR;
    if (vaultDir) {
      await startVaultWatcher(vaultDir);
    }
  }
}
