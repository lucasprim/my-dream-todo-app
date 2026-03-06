"use server";

import { getDb } from "@/lib/db-server";
import {
  generateToken as _generateToken,
  deleteAllTokens as _deleteAllTokens,
  hasToken as _hasToken,
} from "./token-actions-impl";

export async function generateTokenAction(): Promise<string> {
  const db = getDb();
  return _generateToken(db);
}

export async function regenerateTokenAction(): Promise<string> {
  const db = getDb();
  await _deleteAllTokens(db);
  return _generateToken(db);
}

export async function hasTokenAction(): Promise<boolean> {
  const db = getDb();
  return _hasToken(db);
}
