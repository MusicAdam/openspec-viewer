import { readdir, lstat } from 'fs/promises';
import { basename, dirname, join, relative, resolve } from 'path';

const excludedDirectories = new Set([
  '.git', '.hg', '.svn', 'node_modules', 'bower_components', 'vendor',
  'dist', 'dist-frontend', 'build', 'out', 'coverage', '.cache',
  '.next', '.nuxt', '.svelte-kit', '.turbo', '.venv', 'venv',
  '.npm', 'npm-cache', '.pnpm-store', '.yarn', '.pnpm',
  '.pytest_cache', '.mypy_cache', '.tox', '.gradle', '.vs',
  'obj', 'target', '__pycache__', '$RECYCLE.BIN', 'System Volume Information',
]);

export interface DiscoveredProject {
  id: string;
  name: string;
  path: string;
  relativePath: string;
}

export interface DiscoveryResult {
  root: string;
  projects: DiscoveredProject[];
  warnings: string[];
  scannedAt: string;
}

export function describeProject(openspecPath: string, root: string): DiscoveredProject {
  const path = resolve(openspecPath);
  return {
    id: Buffer.from(path).toString('base64url'),
    name: basename(dirname(path)).replace(/[-_]/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase()),
    path,
    relativePath: relative(root, path) || '.',
  };
}

export async function discoverProjects(rootPath: string): Promise<DiscoveryResult> {
  const root = resolve(rootPath);
  const projects: DiscoveredProject[] = [];
  const warnings: string[] = [];
  const rootStats = await lstat(root);
  if (!rootStats.isDirectory() || rootStats.isSymbolicLink()) {
    throw new Error(`Discovery root must be a directory, not a link: ${root}`);
  }

  async function visit(path: string): Promise<void> {
    let entries;
    try {
      entries = await readdir(path, { withFileTypes: true });
    } catch (error) {
      warnings.push(`Cannot scan ${path}: ${error instanceof Error ? error.message : String(error)}`);
      return;
    }

    if (basename(path).toLowerCase() === 'openspec' && entries.some((entry) =>
      (entry.isDirectory() && (entry.name === 'specs' || entry.name === 'changes')) ||
      (entry.isFile() && entry.name === 'config.yaml')
    )) {
      projects.push(describeProject(path, root));
      return;
    }

    for (const entry of entries) {
      if (entry.isDirectory() && !entry.isSymbolicLink() && !excludedDirectories.has(entry.name)) {
        await visit(join(path, entry.name));
      }
    }
  }

  await visit(root);
  projects.sort((a, b) => a.relativePath.localeCompare(b.relativePath));
  return { root, projects, warnings, scannedAt: new Date().toISOString() };
}
