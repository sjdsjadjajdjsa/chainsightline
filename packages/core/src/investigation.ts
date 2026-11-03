import { z } from "zod";
export const addressSchema = z.string().regex(/^0x[0-9a-fA-F]{40}$/);
export const transactionHashSchema = z.string().regex(/^0x[0-9a-fA-F]{64}$/);
export const subjectSchema = z.object({ kind: z.enum(["address", "transaction"]), value: z.string().min(1).max(66) }).refine(({ kind, value }) => kind === "address" ? addressSchema.safeParse(value).success : transactionHashSchema.safeParse(value).success, { message: "Enter a valid Ethereum address or transaction hash" });
export const movementSchema = z.object({ id: z.string(), kind: z.enum(["native-transfer", "token-transfer", "approval"]), from: addressSchema, to: addressSchema, asset: z.string(), amount: z.string(), description: z.string(), evidenceId: z.string(), rawAmount: z.string().optional(), transactionHash: transactionHashSchema.optional(), assetAddress: addressSchema.optional(), decimals: z.number().int().min(0).max(36).optional(), usd: z.string().optional() }).strict();
export const investigationSchema = z.object({
  id: z.string(),
  synthetic: z.boolean(),
  kind: z.enum(["sample", "transaction", "address"]),
  chain: z.literal("ethereum-mainnet"),
  subject: addressSchema,
  transactionHash: transactionHashSchema.optional(),
  status: z.enum(["success", "failed"]).optional(),
  blockNumber: z.string(),
  blockHash: z.string().regex(/^0x[0-9a-fA-F]{64}$/),
  observedAt: z.string(),
  source: z.string(),
  coverage: z.object({ status: z.enum(["partial", "complete"]), summary: z.string(), limitations: z.array(z.string()) }),
  movements: z.array(movementSchema),
  warnings: z.array(z.object({ id: z.string(), title: z.string(), reason: z.string(), evidenceId: z.string(), severity: z.enum(["review", "information"]) })),
  explanation: z.object({ summary: z.string(), uncertainty: z.string(), evidenceIds: z.array(z.string()) }),
  names: z.record(z.string(), z.object({ name: z.string().max(80), source: z.enum(["ens", "known"]) })).optional(),
  prices: z.object({ source: z.string(), basis: z.enum(["at the time", "today"]) }).optional(),
}).strict();
export type Investigation = z.infer<typeof investigationSchema>;
