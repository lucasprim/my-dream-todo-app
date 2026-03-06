import { getDb } from "@/lib/db-server";
import { hasToken } from "@/app/actions/token-actions-impl";
import { SettingsClient } from "./settings-client";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const db = getDb();
  const tokenExists = await hasToken(db);
  return <SettingsClient hasExistingToken={tokenExists} />;
}
