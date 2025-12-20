import { stat } from 'fs/promises';
import type { Project, Spec, Change, Stats, SearchResult, ParseResult } from '../shared/types.js';
import { parseProject } from './project.js';
import { parseSpecs, parseSpec } from './specs.js';
import { parseChanges, parseChangeByName } from './changes.js';

export interface OpenSpecData {
  project: Project;
  specs: Spec[];
  changes: {
    active: Change[];
    archived: Change[];
  };
  stats: Stats;
}

/**
 * Parse an entire OpenSpec directory
 */
export async function parseOpenSpec(openspecPath: string): Promise<ParseResult<OpenSpecData>> {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Validate path exists
  try {
    const stats = await stat(openspecPath);
    if (!stats.isDirectory()) {
      return {
        data: null,
        errors: [`${openspecPath} is not a directory`],
        warnings: [],
      };
    }
  } catch (error) {
    return {
      data: null,
      errors: [`OpenSpec directory not found: ${openspecPath}`],
      warnings: [],
    };
  }

  // Parse all components
  const [projectResult, specsResult, changesResult] = await Promise.all([
    parseProject(openspecPath),
    parseSpecs(openspecPath),
    parseChanges(openspecPath),
  ]);

  errors.push(...projectResult.errors, ...specsResult.errors, ...changesResult.errors);
  warnings.push(...projectResult.warnings, ...specsResult.warnings, ...changesResult.warnings);

  if (!projectResult.data || !specsResult.data || !changesResult.data) {
    return { data: null, errors, warnings };
  }

  // Calculate stats
  const stats = calculateStats(specsResult.data, changesResult.data);

  return {
    data: {
      project: projectResult.data,
      specs: specsResult.data,
      changes: changesResult.data,
      stats,
    },
    errors,
    warnings,
  };
}

/**
 * Calculate overall statistics
 */
function calculateStats(
  specs: Spec[],
  changes: { active: Change[]; archived: Change[] }
): Stats {
  // Calculate overall task progress from active changes
  let totalDone = 0;
  let totalTasks = 0;

  for (const change of changes.active) {
    totalDone += change.taskProgress.done;
    totalTasks += change.taskProgress.total;
  }

  return {
    totalSpecs: specs.length,
    activeChanges: changes.active.length,
    archivedChanges: changes.archived.length,
    overallTaskProgress: {
      done: totalDone,
      total: totalTasks,
      percentage: totalTasks > 0 ? Math.round((totalDone / totalTasks) * 100) : 0,
    },
  };
}

/**
 * Search across all OpenSpec content
 */
export function searchOpenSpec(data: OpenSpecData, query: string): SearchResult[] {
  const results: SearchResult[] = [];
  const lowerQuery = query.toLowerCase();

  // Search project
  if (data.project.content.toLowerCase().includes(lowerQuery)) {
    const matchLine = findMatchLine(data.project.content, lowerQuery);
    results.push({
      type: 'project',
      name: data.project.name,
      path: data.project.path,
      excerpt: getExcerpt(data.project.content, lowerQuery),
      matchLine,
    });
  }

  // Search specs
  for (const spec of data.specs) {
    if (spec.specContent.toLowerCase().includes(lowerQuery)) {
      const matchLine = findMatchLine(spec.specContent, lowerQuery);
      results.push({
        type: 'spec',
        name: spec.name,
        path: spec.path,
        excerpt: getExcerpt(spec.specContent, lowerQuery),
        matchLine,
      });
    }
    if (spec.designContent?.toLowerCase().includes(lowerQuery)) {
      const matchLine = findMatchLine(spec.designContent, lowerQuery);
      results.push({
        type: 'spec',
        name: `${spec.name} (design)`,
        path: spec.path,
        excerpt: getExcerpt(spec.designContent, lowerQuery),
        matchLine,
      });
    }
  }

  // Search changes
  const allChanges = [...data.changes.active, ...data.changes.archived];
  for (const change of allChanges) {
    if (change.proposal?.toLowerCase().includes(lowerQuery)) {
      const matchLine = findMatchLine(change.proposal, lowerQuery);
      results.push({
        type: 'change',
        name: change.name,
        path: change.path,
        excerpt: getExcerpt(change.proposal, lowerQuery),
        matchLine,
      });
    }
  }

  return results;
}

/**
 * Find the line number of first match
 */
function findMatchLine(content: string, query: string): number {
  const lowerContent = content.toLowerCase();
  const index = lowerContent.indexOf(query);
  if (index === -1) return 0;

  const beforeMatch = content.substring(0, index);
  return beforeMatch.split('\n').length;
}

/**
 * Get an excerpt around the match
 */
function getExcerpt(content: string, query: string): string {
  const lowerContent = content.toLowerCase();
  const index = lowerContent.indexOf(query);
  if (index === -1) return content.substring(0, 100) + '...';

  const start = Math.max(0, index - 50);
  const end = Math.min(content.length, index + query.length + 50);

  let excerpt = content.substring(start, end);
  if (start > 0) excerpt = '...' + excerpt;
  if (end < content.length) excerpt = excerpt + '...';

  return excerpt.replace(/\n/g, ' ');
}

// Re-export individual parsers for targeted updates
export { parseProject } from './project.js';
export { parseSpecs, parseSpec } from './specs.js';
export { parseChanges, parseChangeByName } from './changes.js';
export { parseTasks } from './tasks.js';
