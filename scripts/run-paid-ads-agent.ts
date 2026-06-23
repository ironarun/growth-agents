import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { runPaidAdsAgent } from '../agents/paid-ads-agent.js';

function parseUserInstruction(args: string[]): string {
  const fileFlagIndex = args.findIndex((arg) => arg === '--instruction-file' || arg === '--file');

  if (fileFlagIndex < 0) {
    return args.join(' ');
  }

  const filePath = args[fileFlagIndex + 1];

  if (!filePath || filePath.startsWith('--')) {
    throw new Error('Missing instruction file path. Usage: npm.cmd run agent:paid-ads -- --instruction-file .\\input\\paid-ads\\batch-research-example.txt');
  }

  const resolvedPath = resolve(process.cwd(), filePath);

  if (!existsSync(resolvedPath)) {
    throw new Error(`Instruction file not found: ${resolvedPath}`);
  }

  try {
    return readFileSync(resolvedPath, 'utf8');
  } catch (error) {
    throw new Error(`Could not read instruction file ${resolvedPath}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

async function main(): Promise<void> {
  const userInstruction = parseUserInstruction(process.argv.slice(2));
  const result = await runPaidAdsAgent(userInstruction);
  console.log(result.terminalResponse);
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exit(1);
});
