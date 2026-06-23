import { runPaidAdsAgent } from '../agents/paid-ads-agent.js';

async function main(): Promise<void> {
  const userInstruction = process.argv.slice(2).join(' ');
  const result = await runPaidAdsAgent(userInstruction);
  console.log(result.terminalResponse);
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exit(1);
});
