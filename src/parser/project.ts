import { readFile } from 'fs/promises';
import { join, basename, resolve, dirname } from 'path';
import type { Project, ParseResult } from '../shared/types.js';

/**
 * Convert a folder name to a human-readable project name
 * e.g., "my-project" -> "My Project", "my_project" -> "My Project"
 */
function folderNameToProjectName(folderName: string): string {
  return folderName
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

/**
 * Parse the project.md file from an OpenSpec directory
 */
export async function parseProject(openspecPath: string): Promise<ParseResult<Project>> {
  const errors: string[] = [];
  const warnings: string[] = [];

  const projectPath = join(openspecPath, 'project.md');

  // Infer project name from parent folder (openspecPath is typically project/openspec/)
  const projectRoot = dirname(resolve(openspecPath));
  const folderName = basename(projectRoot);
  const name = folderNameToProjectName(folderName);

  try {
    const content = await readFile(projectPath, 'utf-8');

    // Extract description from first paragraph after heading
    const descMatch = content.match(/^#\s+.+\n+(.+?)(?:\n\n|\n#|$)/s);
    const description = descMatch ? descMatch[1].trim() : '';

    return {
      data: {
        name,
        description,
        path: projectPath,
        content,
      },
      errors,
      warnings,
    };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      warnings.push('project.md not found');
      return {
        data: {
          name,
          description: 'No project.md file found',
          path: projectPath,
          content: '',
        },
        errors,
        warnings,
      };
    }
    errors.push(`Failed to read project.md: ${error}`);
    return { data: null, errors, warnings };
  }
}
