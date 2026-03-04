import { getDb, getVaultDir } from "@/lib/db-server";
import { getTasksByFile } from "@/db/queries";
import { InboxClient } from "./inbox-client";
import { VAULT_FILES } from "@/lib/vault-config";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

export default async function InboxPage() {
  const db = getDb();
  const vaultDir = getVaultDir();

  // Ensure inbox file exists
  const inboxPath = path.join(vaultDir, VAULT_FILES.INBOX);
  if (!fs.existsSync(inboxPath)) {
    fs.mkdirSync(path.dirname(inboxPath), { recursive: true });
    fs.writeFileSync(inboxPath, "---\ntype: inbox\n---\n\n# Inbox\n\n", "utf8");
  }

  const tasks = await getTasksByFile(db, VAULT_FILES.INBOX);

  return <InboxClient initialTasks={tasks} />;
}
