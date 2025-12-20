import { readFile } from 'fs/promises';
import { join } from 'path';
import type { Project, ParseResult } from '../shared/types.js';

/**
 * Parse the project.md file from an OpenSpec directory
 */
export async function parseProject(openspecPath: string): Promise<ParseResult<Project>> {
  const errors: string[] = [];
  const warnings: string[] = [];

  const projectPath = join(openspecPath, 'project.md');

  try {
    const content = await readFile(projectPath, 'utf-8');

    // Extract project name from first heading
    const nameMatch = content.match(/^#\s+(.+)$/m);
    const name = nameMatch ? nameMatch[1].trim() : 'Unknown Project';

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
          name: 'OpenSpec Project',
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
