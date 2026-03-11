"use server";

import { eq } from "drizzle-orm";
import { getDb, getVaultDir } from "@/lib/db-server";
import { searchPeople } from "@/db/queries";
import * as schema from "@/db/schema";
import type { Person } from "@/db/schema";
import fs from "fs";
import path from "path";
import { VAULT_DIRS } from "@/lib/vault-config";
import { reindexFile } from "@/db/indexer";

function nameToSlug(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export async function searchPeopleAction(
  query: string
): Promise<Person[]> {
  const db = getDb();
  return searchPeople(db, query);
}

export async function createPersonAction(input: {
  name: string;
  email?: string;
  company?: string;
}): Promise<string> {
  const db = getDb();
  const vaultDir = getVaultDir();
  const slug = nameToSlug(input.name);

  // Create the People/ vault file
  const relPath = `${VAULT_DIRS.PEOPLE}/${slug}.md`;
  const fullPath = path.join(vaultDir, relPath);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });

  const frontmatter: string[] = [];
  if (input.email) frontmatter.push(`email: ${input.email}`);
  if (input.company) frontmatter.push(`company: ${input.company}`);

  const content = frontmatter.length > 0
    ? `---\n${frontmatter.join("\n")}\n---\n\n# ${input.name}\n`
    : `# ${input.name}\n`;

  fs.writeFileSync(fullPath, content, "utf8");
  await reindexFile(db, vaultDir, relPath);

  return slug;
}
