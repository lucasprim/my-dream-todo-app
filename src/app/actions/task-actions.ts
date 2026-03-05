"use server";

import { getDb, getVaultDir } from "@/lib/db-server";
import type { Priority } from "@/lib/markdown/schemas";
import {
  createTask as _createTask,
  updateTask as _updateTask,
  completeTask as _completeTask,
  deleteTask as _deleteTask,
  quickCaptureToInbox as _quickCaptureToInbox,
  reorderTasks as _reorderTasks,
} from "./task-actions-impl";

export async function createTaskAction(input: {
  title: string;
  filePath: string;
  dueDate?: string;
  priority?: Priority;
  tags?: string[];
  recurrence?: string;
}): Promise<void> {
  const db = getDb();
  const vaultDir = getVaultDir();
  await _createTask(db, vaultDir, input);
}

export async function updateTaskAction(
  taskId: number,
  patch: Partial<{
    title: string;
    dueDate: string | null;
    priority: Priority;
    tags: string[];
    recurrence: string | null;
  }>
): Promise<void> {
  const db = getDb();
  const vaultDir = getVaultDir();
  await _updateTask(db, vaultDir, taskId, patch);
}

export async function completeTaskAction(taskId: number): Promise<void> {
  const db = getDb();
  const vaultDir = getVaultDir();
  await _completeTask(db, vaultDir, taskId);
}

export async function deleteTaskAction(taskId: number): Promise<void> {
  const db = getDb();
  const vaultDir = getVaultDir();
  await _deleteTask(db, vaultDir, taskId);
}

export async function reorderTasksAction(orderedTaskIds: number[]): Promise<void> {
  const db = getDb();
  const vaultDir = getVaultDir();
  await _reorderTasks(db, vaultDir, orderedTaskIds);
}

export async function quickCaptureToInboxAction(input: {
  title: string;
  dueDate?: string;
  priority?: Priority;
  tags?: string[];
  recurrence?: string;
}): Promise<void> {
  const db = getDb();
  const vaultDir = getVaultDir();
  await _quickCaptureToInbox(db, vaultDir, input);
}
