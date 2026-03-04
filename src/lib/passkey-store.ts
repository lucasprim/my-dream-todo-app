/**
 * Simple file-based passkey credential store for single-user deployments.
 * Stores the registered passkey credential as JSON at PASSKEY_STORE_PATH
 * (defaults to .passkey.json in the vault directory or cwd).
 */
import fs from "fs";
import path from "path";
type AuthenticatorTransport = "ble" | "cable" | "hybrid" | "internal" | "nfc" | "smart-card" | "usb";

export interface StoredCredential {
  id: string;
  publicKey: string; // base64
  counter: number;
  transports?: AuthenticatorTransport[];
}

function storePath(): string {
  return (
    process.env.PASSKEY_STORE_PATH ??
    path.join(process.env.VAULT_DIR ?? process.cwd(), ".passkey.json")
  );
}

export function loadCredential(): StoredCredential | null {
  const p = storePath();
  if (!fs.existsSync(p)) return null;
  return JSON.parse(fs.readFileSync(p, "utf8")) as StoredCredential;
}

export function saveCredential(cred: StoredCredential): void {
  fs.writeFileSync(storePath(), JSON.stringify(cred, null, 2), "utf8");
}

export function deleteCredential(): void {
  const p = storePath();
  if (fs.existsSync(p)) fs.unlinkSync(p);
}
