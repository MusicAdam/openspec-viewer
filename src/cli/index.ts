#!/usr/bin/env node
import { Command } from 'commander';
import { resolve } from 'path';
import { stat } from 'fs/promises';
import open from 'open';
import { createServer } from '../server/index.js';

const program = new Command();

program
  .name('openspec-viewer')
  .description('Interactive browser viewer for OpenSpec directories')
  .version('0.1.0')
  .argument('[path]', 'Path to OpenSpec directory', '.')
  .option('-p, --port <number>', 'Port to run server on', '3000')
  .option('--no-open', 'Do not open browser automatically')
  .action(async (path: string, options: { port: string; open: boolean }) => {
    const openspecPath = resolve(process.cwd(), path);
    const port = parseInt(options.port, 10);

    // Validate path
    try {
      const stats = await stat(openspecPath);
      if (!stats.isDirectory()) {
        console.error(`Error: ${openspecPath} is not a directory`);
        process.exit(1);
      }
    } catch (error) {
      console.error(`Error: ${openspecPath} does not exist`);
      process.exit(1);
    }

    console.log(`Starting OpenSpec Viewer...`);
    console.log(`Path: ${openspecPath}`);

    try {
      const server = await createServer({
        openspecPath,
        port,
      });

      // Open browser
      if (options.open) {
        await open(server.url);
      }

      // Handle shutdown
      const shutdown = async () => {
        console.log('\nShutting down...');
        await server.close();
        process.exit(0);
      };

      process.on('SIGINT', shutdown);
      process.on('SIGTERM', shutdown);

      console.log(`\nPress Ctrl+C to stop`);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'EADDRINUSE') {
        console.error(`Error: Port ${port} is already in use`);
        console.error(`Try using a different port: openspec-viewer --port 3001`);
        process.exit(1);
      }
      console.error('Failed to start server:', error);
      process.exit(1);
    }
  });

program.parse();
