import { z } from "zod";
export const evidenceSchema=z.object({id:z.string().min(1),kind:z.enum(["native-transfer","token-transfer","approval","label"]),description:z.string().max(4000)}).strict();
export const evidencePackageSchema=z.object({version:z.literal("1"),synthetic:z.boolean(),chain:z.literal("ethereum-mainnet"),blockHash:z.string().regex(/^0x[0-9a-f]{64}$/),coverage:z.string().max(2000),evidence:z.array(evidenceSchema).min(1).max(50)}).strict();
export const analysisSchema=z.object({summary:z.string().min(1).max(3000),evidenceIds:z.array(z.string()).max(50),uncertainty:z.string().min(1).max(2000)}).strict();
export type EvidencePackage=z.infer<typeof evidencePackageSchema>;
export type EvidenceAnalysis=z.infer<typeof analysisSchema>;
export type AnalysisUsage={costUsd:number|null;promptTokens:number|null;completionTokens:number|null};
export type AnalysisResult={analysis:EvidenceAnalysis;provider:string;model:string;usage:AnalysisUsage};
export type AnalysisErrorCode="configuration"|"timeout"|"provider"|"unsupported"|"invalid-response"|"budget";
export class AnalysisError extends Error{constructor(public readonly code:AnalysisErrorCode,message:string,public readonly retryable=false){super(message);this.name="AnalysisError"}}
export interface AnalysisProvider{explain(evidence:EvidencePackage):Promise<AnalysisResult>}
export const analysisJsonSchema={type:"object",properties:{summary:{type:"string",minLength:1,maxLength:3000},evidenceIds:{type:"array",maxItems:50,items:{type:"string"}},uncertainty:{type:"string",minLength:1,maxLength:2000}},required:["summary","evidenceIds","uncertainty"],additionalProperties:false} as const;
