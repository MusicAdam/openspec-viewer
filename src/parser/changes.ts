import { readdir, readFile, stat } from 'fs/promises';
import { join } from 'path';
import type { Change, SpecDelta, DeltaOperation, ParseResult } from '../shared/types.js';
import { parseTasks } from './tasks.js';

/**
 * Parse all changes from the changes/ directory
 */
export async function parseChanges(openspecPath: string): Promise<ParseResult<{ active: Change[]; archived: Change[] }>> {
  const errors: string[] = [];
  const warnings: string[] = [];
  const active: Change[] = [];
  const archived: Change[] = [];

  const changesPath = join(openspecPath, 'changes');

  try {
    const entries = await readdir(changesPath, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.isDirectory()) {
        if (entry.name === 'archive') {
          // Parse archived changes
          const archiveResult = await parseArchivedChanges(join(changesPath, 'archive'));
          archived.push(...archiveResult.data);
          errors.push(...archiveResult.errors);
          warnings.push(...archiveResult.warnings);
        } else {
          // Parse active change
          const changePath = join(changesPath, entry.name);
          const changeResult = await parseChange(entry.name, changePath, false);

          if (changeResult.data) {
            active.push(changeResult.data);
          }
          errors.push(...changeResult.errors);
          warnings.push(...changeResult.warnings);
        }
      }
    }

    // Sort active changes alphabetically
    active.sort((a, b) => a.name.localeCompare(b.name));

    // Sort archived by date (newest first)
    archived.sort((a, b) => {
      if (a.archivedDate && b.archivedDate) {
        return b.archivedDate.localeCompare(a.archivedDate);
      }
      return a.name.localeCompare(b.name);
    });

    return { data: { active, archived }, errors, warnings };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      warnings.push('changes/ directory not found');
      return { data: { active: [], archived: [] }, errors, warnings };
    }
    errors.push(`Failed to read changes directory: ${error}`);
    return { data: null, errors, warnings };
  }
}

/**
 * Parse archived changes from archive/ directory
 */
async function parseArchivedChanges(archivePath: string): Promise<{ data: Change[]; errors: string[]; warnings: string[] }> {
  const errors: string[] = [];
  const warnings: string[] = [];
  const archived: Change[] = [];

  try {
    const entries = await readdir(archivePath, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.isDirectory()) {
        const changePath = join(archivePath, entry.name);
        const changeResult = await parseChange(entry.name, changePath, true);

        if (changeResult.data) {
          archived.push(changeResult.data);
        }
        errors.push(...changeResult.errors);
        warnings.push(...changeResult.warnings);
      }
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      errors.push(`Failed to read archive directory: ${error}`);
    }
  }

  return { data: archived, errors, warnings };
}

/**
 * Parse a single change directory
 */
async function parseChange(
  name: string,
  changePath: string,
  isArchived: boolean
): Promise<ParseResult<Change>> {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Extract date from archived change name (YYYY-MM-DD-name format)
  let archivedDate: string | null = null;
  if (isArchived) {
    const dateMatch = name.match(/^(\d{4}-\d{2}-\d{2})-/);
    if (dateMatch) {
      archivedDate = dateMatch[1];
    }
  }

  // Read proposal.md
  let proposal: string | null = null;
  try {
    proposal = await readFile(join(changePath, 'proposal.md'), 'utf-8');
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      warnings.push(`${name}: Failed to read proposal.md`);
    }
  }

  // Read and parse tasks.md
  let tasksContent: string | null = null;
  try {
    tasksContent = await readFile(join(changePath, 'tasks.md'), 'utf-8');
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      warnings.push(`${name}: Failed to read tasks.md`);
    }
  }
  const { tasks, progress: taskProgress } = parseTasks(tasksContent || '');

  // Read design.md (optional)
  let design: string | null = null;
  try {
    design = await readFile(join(changePath, 'design.md'), 'utf-8');
  } catch (error) {
    // design.md is optional
  }

  // Parse spec deltas
  const specDeltas = await parseSpecDeltas(join(changePath, 'specs'));

  return {
    data: {
      name,
      path: changePath,
      isArchived,
      archivedDate,
      proposal,
      tasks,
      tasksRaw: tasksContent,
      taskProgress,
      design,
      specDeltas: specDeltas.data,
    },
    errors,
    warnings,
  };
}

/**
 * Parse spec delta files from a change's specs/ subdirectory
 */
async function parseSpecDeltas(specsPath: string): Promise<{ data: SpecDelta[]; errors: string[] }> {
  const errors: string[] = [];
  const deltas: SpecDelta[] = [];

  try {
    const entries = await readdir(specsPath, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.isDirectory()) {
        const specPath = join(specsPath, entry.name, 'spec.md');
        try {
          const content = await readFile(specPath, 'utf-8');
          const operations = parseDeltaOperations(content);

          deltas.push({
            capability: entry.name,
            content,
            operations,
          });
        } catch (error) {
          if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
            errors.push(`Failed to read spec delta for ${entry.name}`);
          }
        }
      }
    }
  } catch (error) {
    // specs/ subdirectory is optional
  }

  return { data: deltas, errors };
}

/**
 * Parse delta operations (ADDED, MODIFIED, REMOVED, RENAMED) from spec content
 */
function parseDeltaOperations(content: string): DeltaOperation[] {
  const operations: DeltaOperation[] = [];
  const lines = content.split('\n');

  const sectionRegex = /^##\s+(ADDED|MODIFIED|REMOVED|RENAMED)\s+Requirements?/i;
  const requirementRegex = /^###\s+Requirement:\s*(.+)/i;

  let currentSection: 'added' | 'modified' | 'removed' | 'renamed' | null = null;
  let currentRequirement: { name: string; startLine: number; content: string[] } | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Check for section headers
    const sectionMatch = line.match(sectionRegex);
    if (sectionMatch) {
      // Save previous requirement if exists
      if (currentRequirement && currentSection) {
        operations.push({
          type: currentSection,
          name: currentRequirement.name,
          content: currentRequirement.content.join('\n'),
          startLine: currentRequirement.startLine,
          endLine: i,
        });
      }
      currentSection = sectionMatch[1].toLowerCase() as 'added' | 'modified' | 'removed' | 'renamed';
      currentRequirement = null;
      continue;
    }

    // Check for requirement headers
    const reqMatch = line.match(requirementRegex);
    if (reqMatch && currentSection) {
      // Save previous requirement if exists
      if (currentRequirement) {
        operations.push({
          type: currentSection,
          name: currentRequirement.name,
          content: currentRequirement.content.join('\n'),
          startLine: currentRequirement.startLine,
          endLine: i,
        });
      }
      currentRequirement = {
        name: reqMatch[1].trim(),
        startLine: i + 1,
        content: [line],
      };
      continue;
    }

    // Add line to current requirement content
    if (currentRequirement) {
      currentRequirement.content.push(line);
    }
  }

  // Don't forget the last requirement
  if (currentRequirement && currentSection) {
    operations.push({
      type: currentSection,
      name: currentRequirement.name,
      content: currentRequirement.content.join('\n'),
      startLine: currentRequirement.startLine,
      endLine: lines.length,
    });
  }

  return operations;
}

/**
 * Parse a single change by name
 */
export async function parseChangeByName(
  openspecPath: string,
  changeName: string
): Promise<ParseResult<Change>> {
  const changesPath = join(openspecPath, 'changes');

  // Try active changes first
  const activePath = join(changesPath, changeName);
  try {
    const stats = await stat(activePath);
    if (stats.isDirectory()) {
      return parseChange(changeName, activePath, false);
    }
  } catch (error) {
    // Not in active, try archive
  }

  // Try archived changes
  const archivePath = join(changesPath, 'archive');
  try {
    const entries = await readdir(archivePath, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory() && entry.name.includes(changeName)) {
        return parseChange(entry.name, join(archivePath, entry.name), true);
      }
    }
  } catch (error) {
    // Archive doesn't exist
  }

  return {
    data: null,
    errors: [`Change ${changeName} not found`],
    warnings: [],
  };
}
