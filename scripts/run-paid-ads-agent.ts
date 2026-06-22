import { runPaidAdsAgent } from '../agents/paid-ads-agent.js';

function main(): void {
  const userInstruction = process.argv.slice(2).join(' ');
  const result = runPaidAdsAgent(userInstruction);
  console.log(result.terminalResponse);
}

main();
