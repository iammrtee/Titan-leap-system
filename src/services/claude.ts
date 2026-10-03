import Anthropic from '@anthropic-ai/sdk';

let anthropicClient: Anthropic | null = null;

const getAnthropicClient = () => {
  if (anthropicClient) return anthropicClient;
  
  const apiKey = process.env.CLAUDE_API_KEY;

  if (typeof window === 'undefined') {
    if (!apiKey || apiKey === 'undefined' || apiKey === 'your-claude-api-key') {
      console.warn("SERVER: CLAUDE_API_KEY is missing or using placeholder.");
    }
  }

  if (!apiKey || apiKey === 'undefined' || apiKey === 'your-claude-api-key') {
    throw new Error("Claude API access restricted. Please add your 'CLAUDE_API_KEY' in the Settings > Secrets panel of AI Studio.");
  }

  anthropicClient = new Anthropic({
    apiKey: apiKey,
    dangerouslyAllowBrowser: true,
  });
  
  return anthropicClient;
};

// Current default. Override with CLAUDE_MODEL in Render without a deploy.
export const DEFAULT_CLAUDE_MODEL = (typeof process !== 'undefined' && process.env?.CLAUDE_MODEL) || 'claude-sonnet-5-5';
// Screenshot marking is simple; override with CLAUDE_VISION_MODEL (e.g. claude-haiku-4-5) to cut cost.
export const VISION_CLAUDE_MODEL = (typeof process !== 'undefined' && process.env?.CLAUDE_VISION_MODEL) || 'claude-sonnet-5-5';

// $ per million tokens [input, output], from Anthropic's published pricing. Used only for cost logs.
const PRICE_PER_MTOK: Array<[RegExp, [number, number]]> = [
  [/^claude-sonnet-5/, [2, 10]],
  [/^claude-opus-5-5/, [4, 20]],
  [/^claude-opus-5|^claude-opus-4/, [5, 25]],
  [/^claude-fable|^claude-mythos/, [10, 50]],
  [/^claude-sonnet-4/, [3, 15]],
  [/^claude-haiku-4/, [1, 5]],
];

export const estimateCostUsd = (model: string, usage: any) => {
  const row = PRICE_PER_MTOK.find(([re]) => re.test(model));
  if (!row || !usage) return null;
  const [inP, outP] = row[1];
  const input = (usage.input_tokens || 0) + (usage.cache_creation_input_tokens || 0) * 1.25 + (usage.cache_read_input_tokens || 0) * 0.1;
  return (input * inP + (usage.output_tokens || 0) * outP) / 1_000_000;
};

// Newer models reject assistant prefill and non-default sampling (HTTP 400); older Haiku accepts temperature.
const acceptsTemperature = (model: string) => /^claude-haiku/.test(model);

export const generateClaudeContent = async (params: {
  prompt: string;
  systemPrompt?: string;
  responseMimeType?: string;
  temperature?: number;
  apiKey?: string;
  model?: string;
  useWebSearch?: boolean;
  webSearchMaxUses?: number;
  prefillAssistant?: string;
  effort?: 'low' | 'medium' | 'high';
}) => {
  // If in browser, call the server proxy
  if (typeof window !== 'undefined') {
    try {
      const { getAuthHeader } = await import('../lib/supabase');
      const authHeader = await getAuthHeader();
      const response = await fetch('/api/ai/claude', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeader,
        },
        body: JSON.stringify(params),
      });

      if (!response.ok) {
        let errorData;
        try {
          errorData = await response.json();
        } catch (e) {
          errorData = { error: `Server responded with ${response.status}` };
        }
        throw new Error(errorData.error || `Server responded with ${response.status}`);
      }

      const result = await response.json();
      return result;
    } catch (error: any) {
      console.error("Claude Proxy Client Error:", error);
      throw error;
    }
  }

  // Server-side execution
  try {
    const keyToUse = params.apiKey || process.env.CLAUDE_API_KEY;
    
    if (!keyToUse || keyToUse === 'undefined' || keyToUse === 'your-claude-api-key') {
      throw new Error("Claude API access restricted. Please add your 'CLAUDE_API_KEY' in the Settings > Secrets panel.");
    }

    const client = new Anthropic({
      apiKey: keyToUse,
    });
    
    const modelId = params.model || DEFAULT_CLAUDE_MODEL;

    // No real prefill: current models reject it. Ask for JSON in the prompt instead.
    const promptText = params.prefillAssistant
      ? `${params.prompt}\n\nRespond with ONLY the JSON, starting with ${params.prefillAssistant}. No prose, no markdown fences.`
      : params.prompt;

    const send = (searchTool: string) => client.messages.create({
      model: modelId,
      max_tokens: 16000,
      ...(acceptsTemperature(modelId) ? { temperature: params.temperature ?? 0.7 } : { output_config: { effort: params.effort ?? 'medium' } as any }),
      system: params.systemPrompt,
      messages: [{ role: "user", content: [{ type: "text", text: promptText }] }],
      ...(params.useWebSearch ? {
        tools: [{ type: searchTool as any, name: "web_search", max_uses: params.webSearchMaxUses ?? 5 } as any]
      } : {})
    } as any);

    const started = Date.now();
    let response: any;
    try {
      response = await send(/^claude-(sonnet|opus|fable|mythos)-5/.test(modelId) ? 'web_search_20260209' : 'web_search_20250305');
    } catch (e: any) {
      // The newer web-search variant is the only API-shape difference worth a retry.
      if (params.useWebSearch && e?.status === 400) {
        console.warn(`[Claude] ${modelId} rejected the web search tool, retrying with the basic variant: ${e.message}`);
        response = await send('web_search_20250305');
      } else {
        throw e;
      }
    }

    const cost = estimateCostUsd(modelId, response.usage);
    console.log(`[Claude] model=${modelId} in=${response.usage?.input_tokens} out=${response.usage?.output_tokens} cache_read=${response.usage?.cache_read_input_tokens ?? 0} ~$${cost == null ? '?' : cost.toFixed(4)} ${((Date.now() - started) / 1000).toFixed(1)}s`);

    // When web search is used, Claude emits multiple text blocks interleaved with
    // search tool_use/result blocks (e.g. "I'll search for..." then the final answer
    // after results come back). Join every text block so the final structured output
    // is captured, not just the first ("I'll search...") fragment.
    const text = response.content
      .filter((block: any) => block.type === 'text')
      .map((block: any) => block.text)
      .join('\n');

    // The prefill text isn't echoed back by the API, so stitch it back onto the front
    // of the response to reconstruct the full JSON string.
    const fullText = text;

    return {
      text: fullText,
      response,
      costUsd: cost,
    };
  } catch (error: any) {
    console.error("Claude API Error:", error);
    const cleanError = error.message || error.error?.message || String(error);
    throw new Error(cleanError);
  }
};
