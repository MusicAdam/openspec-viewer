import chokidar, { type FSWatcher } from 'chokidar';
import { relative, sep } from 'path';

export type FileChangeHandler = (event: FileChangeEvent) => void;

export interface FileChangeEvent {
  type: 'add' | 'change' | 'unlink';
  path: string;
  affectedEntity: 'project' | 'specs' | 'changes';
  entityId?: string;
}

/**
 * Create a file watcher for an OpenSpec directory
 */
export function createFileWatcher(
  openspecPath: string,
  onChange: FileChangeHandler
): FSWatcher {
  const watcher = chokidar.watch(openspecPath, {
    ignored: [
      /(^|[\/\\])\../, // Ignore dotfiles
      /node_modules/,
    ],
    persistent: true,
    ignoreInitial: true,
    awaitWriteFinish: {
      stabilityThreshold: 100,
      pollInterval: 50,
    },
  });

  const handleEvent = (eventType: 'add' | 'change' | 'unlink') => (filePath: string) => {
    // Only watch .md files
    if (!filePath.endsWith('.md')) {
      return;
    }

    const relativePath = relative(openspecPath, filePath);
    const parts = relativePath.split(sep);

    let affectedEntity: 'project' | 'specs' | 'changes';
    let entityId: string | undefined;

    if (parts[0] === 'specs') {
      affectedEntity = 'specs';
      entityId = parts[1]; // capability name
    } else if (parts[0] === 'changes') {
      affectedEntity = 'changes';
      if (parts[1] === 'archive') {
        entityId = parts[2]; // archived change name
      } else {
        entityId = parts[1]; // active change name
      }
    } else if (parts[0] === 'project.md' || parts[0] === 'AGENTS.md') {
      affectedEntity = 'project';
    } else {
      // Unknown file, treat as project
      affectedEntity = 'project';
    }

    onChange({
      type: eventType,
      path: filePath,
      affectedEntity,
      entityId,
    });
  };

  watcher
    .on('add', handleEvent('add'))
    .on('change', handleEvent('change'))
    .on('unlink', handleEvent('unlink'));

  return watcher;
}
