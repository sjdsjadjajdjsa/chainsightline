import type { Investigation } from "./investigation";
const wallet = "0x" + "11".repeat(20);
const recipient = "0x" + "22".repeat(20);
const spender = "0x" + "33".repeat(20);
export const sampleInvestigation: Investigation = {
  id: "synthetic-ethereum-01", synthetic: true, kind: "sample", chain: "ethereum-mainnet", source: "Invented example", subject: wallet, blockNumber: "19,284,621", blockHash: "0x" + "0".repeat(64), observedAt: "Synthetic example · no live chain request",
  coverage: { status: "partial", summary: "Three illustrative observations", limitations: ["Not a real blockchain investigation", "No execution trace or address history", "No wallet ownership or criminal-activity conclusion"] },
  movements: [
    { id: "movement-1", kind: "native-transfer", from: wallet, to: recipient, asset: "ETH", amount: "0.42", description: "Observed native transfer", evidenceId: "evidence-1" },
    { id: "movement-2", kind: "token-transfer", from: recipient, to: wallet, asset: "USDC", amount: "125.00", description: "Observed token transfer", evidenceId: "evidence-2" },
    { id: "movement-3", kind: "approval", from: wallet, to: spender, asset: "USDC", amount: "Unlimited", description: "Historical approval observed", evidenceId: "evidence-3" },
  ],
  warnings: [{ id: "warning-1", title: "Approval worth reviewing", reason: "A synthetic unlimited USDC approval is present. This is a historical event, not a verified current allowance or evidence that the spender is malicious.", evidenceId: "evidence-3", severity: "review" }],
  explanation: { summary: "This synthetic investigation illustrates how ChainSightline connects movements to their supporting evidence. The example includes one native transfer, one token transfer and a historical approval.", uncertainty: "The data is invented for interface development. No live chain state, current allowance, ownership or malicious activity has been established.", evidenceIds: ["evidence-1", "evidence-2", "evidence-3"] },
};
