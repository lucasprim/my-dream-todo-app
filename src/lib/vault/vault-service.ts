import fs from "fs";
import path from "path";

/**
 * VaultService provides file system access to the Obsidian vault.
 * All paths are relative to the vault root directory.
 */
export class VaultService {
  constructor(private readonly vaultDir: string) {}

  /**
   * Read a file's contents as a string.
   * @param relPath - Path relative to vault root
   */
  readFile(relPath: string): string {
    const fullPath = this.resolve(relPath);
    return fs.readFileSync(fullPath, "utf8");
  }

  /**
   * Write content to a file, creating parent directories as needed.
   * @param relPath - Path relative to vault root
   * @param content - File contents
   */
  writeFile(relPath: string, content: string): void {
    const fullPath = this.resolve(relPath);
    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    fs.writeFileSync(fullPath, content, "utf8");
  }

  /**
   * Check if a file exists.
   */
  exists(relPath: string): boolean {
    return fs.existsSync(this.resolve(relPath));
  }

  /**
   * List all .md files in a directory (relative paths from vault root).
   * @param relDir - Directory relative to vault root
   */
  listMarkdownFiles(relDir: string): string[] {
    const fullDir = this.resolve(relDir);
    if (!fs.existsSync(fullDir)) return [];
    return fs
      .readdirSync(fullDir, { withFileTypes: true })
      .filter((e) => e.isFile() && e.name.endsWith(".md"))
      .map((e) => path.join(relDir, e.name));
  }

  /**
   * Create a new file. Throws if the file already exists.
   */
  createFile(relPath: string, content: string): void {
    const fullPath = this.resolve(relPath);
    if (fs.existsSync(fullPath)) {
      throw new Error(`File already exists: ${relPath}`);
    }
    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    fs.writeFileSync(fullPath, content, "utf8");
  }

  /**
   * Delete a file. Throws if the file does not exist.
   */
  deleteFile(relPath: string): void {
    const fullPath = this.resolve(relPath);
    if (!fs.existsSync(fullPath)) {
      throw new Error(`File not found: ${relPath}`);
    }
    fs.unlinkSync(fullPath);
  }

  /**
   * Resolve a relative path to an absolute path within the vault.
   * Prevents path traversal attacks.
   */
  private resolve(relPath: string): string {
    const resolved = path.resolve(this.vaultDir, relPath);
    if (!resolved.startsWith(path.resolve(this.vaultDir))) {
      throw new Error(`Path traversal detected: ${relPath}`);
    }
    return resolved;
  }
}

/** Get the vault directory from environment or default. */
export function getVaultDir(): string {
  return process.env.VAULT_DIR ?? path.join(process.cwd(), "vault");
}
