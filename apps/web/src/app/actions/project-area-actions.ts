"use server";

import { redirect } from "next/navigation";
import { getDb, getVaultDir } from "@/lib/db-server";
import {
  createProject as _createProject,
  updateProject as _updateProject,
  deleteProject as _deleteProject,
  createArea as _createArea,
  updateArea as _updateArea,
  deleteArea as _deleteArea,
} from "./project-area-actions-impl";

export async function createProjectAction(input: {
  title: string;
  status?: string;
  tags?: string[];
}): Promise<string> {
  const db = getDb();
  const vaultDir = getVaultDir();
  return _createProject(db, vaultDir, input);
}

export async function updateProjectAction(
  slug: string,
  patch: { title?: string; status?: string; tags?: string[] }
): Promise<void> {
  const db = getDb();
  const vaultDir = getVaultDir();
  await _updateProject(db, vaultDir, slug, patch);
}

export async function deleteProjectAction(slug: string): Promise<void> {
  const db = getDb();
  const vaultDir = getVaultDir();
  await _deleteProject(db, vaultDir, slug);
}

export async function createAreaAction(input: {
  title: string;
  tags?: string[];
}): Promise<string> {
  const db = getDb();
  const vaultDir = getVaultDir();
  return _createArea(db, vaultDir, input);
}

export async function updateAreaAction(
  slug: string,
  patch: { title?: string; tags?: string[] }
): Promise<void> {
  const db = getDb();
  const vaultDir = getVaultDir();
  await _updateArea(db, vaultDir, slug, patch);
}

export async function deleteAreaAction(slug: string): Promise<void> {
  const db = getDb();
  const vaultDir = getVaultDir();
  await _deleteArea(db, vaultDir, slug);
}
