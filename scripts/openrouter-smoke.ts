import {OpenRouterAnalysisProvider} from "../packages/providers/src/openrouter.js";
import {syntheticEvidence} from "../packages/providers/test/fixtures.js";
const apiKey=process.env.OPENROUTER_API_KEY;
if(!apiKey)throw new Error("Set OPENROUTER_API_KEY only in the process environment");
const models=(process.env.OPENROUTER_MODELS??"moonshotai/kimi-k3.1-pro,openai/gpt-4.1-mini,google/gemini-2.5-flash").split(",");
let total=0;
let failures=0;
const requireZeroDataRetention=process.env.OPENROUTER_REQUIRE_ZDR!=="false";
for(const model of models){try{const result=await new OpenRouterAnalysisProvider({apiKey,model,maxOutputTokens:700,timeoutMs:60000,maxPrice:{prompt:3,completion:15},requireZeroDataRetention}).explain(syntheticEvidence);const cost=result.usage.costUsd;if(cost===null)throw new Error("Provider omitted cost");total+=cost;console.log(JSON.stringify({model:result.model,provider:result.provider,analysis:result.analysis,usage:result.usage,status:"pass"}))}catch(error){failures+=1;console.log(JSON.stringify({model,status:"fail",error:error instanceof Error?error.message:"Unknown error"}))}}
console.log(JSON.stringify({reportedRequestCostUsd:total,note:"Compatibility smoke only; reconcile against OpenRouter key usage."}));
if(failures>0)process.exitCode=1;
