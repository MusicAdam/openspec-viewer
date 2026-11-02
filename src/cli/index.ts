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
  .argument('[path]', 'Path to a single OpenSpec directory')
  .option('--root <path>', 'Directory to search for OpenSpec projects (default: working directory)')
  .option('-p, --port <number>', 'Port to run server on', '3000')
  .option('--no-open', 'Do not open browser automatically')
  .action(async (path: string | undefined, options: { port: string; open: boolean; root?: string }) => {
    const openspecPath = path ? resolve(process.cwd(), path) : undefined;
    const rootPath = resolve(process.cwd(), options.root || '.');
    const port = parseInt(options.port, 10);

    // Validate path
    try {
      const stats = await stat(openspecPath || rootPath);
      if (!stats.isDirectory()) {
        console.error(`Error: ${openspecPath || rootPath} is not a directory`);
        process.exit(1);
      }
    } catch (error) {
      console.error(`Error: ${openspecPath || rootPath} does not exist`);
      process.exit(1);
    }

    console.log(`Starting OpenSpec Viewer...`);
    console.log(`Workspace: ${rootPath}`);
    if (openspecPath) console.log(`Project: ${openspecPath}`);

    try {
      const server = await createServer({
        openspecPath,
        rootPath,
        port,
      });

      // Open browser
      if (options.open) {
        await open(server.url);
      }

      // Handle shutdown
      const shutdown = async () => {
        console.log('\nShutting down...');
        if (process.stdin.isTTY) {
          process.stdin.setRawMode(false);
        }
        await server.close();
        process.exit(0);
      };

      process.on('SIGINT', shutdown);
      process.on('SIGTERM', shutdown);

      // Enable keyboard shortcuts
      if (process.stdin.isTTY) {
        process.stdin.setRawMode(true);
        process.stdin.resume();
        process.stdin.setEncoding('utf8');

        process.stdin.on('data', async (key: string) => {
          // Ctrl+C in raw mode
          if (key === '\u0003') {
            await shutdown();
            return;
          }
          // 'l' or 'L' to open browser
          if (key.toLowerCase() === 'l') {
            await open(server.url);
          }
        });
      }

      console.log(`\nPress 'l' to open browser, Ctrl+C to stop`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (message.includes('already in use') || (error as NodeJS.ErrnoException).code === 'EADDRINUSE') {
        console.error(`Error: Port ${port} is already in use`);
        console.error(`Try using a different port: openspec-viewer --port 3001`);
        process.exit(1);
      }
      console.error('Failed to start server:', message);
      process.exit(1);
    }
  });

program.parse();
