import Anthropic from '@anthropic-ai/sdk';

// Cached API secret fetched from server
let _apiSecret: string | null = null;
const getApiSecret = async (): Promise<string> => {
  if (_apiSecret) return _apiSecret;
  try {
    const res = await fetch('/api/config');
    const data = await res.json();
    _apiSecret = data.apiSecret || '';
    return _apiSecret;
  } catch {
    return '';
  }
};

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

export const generateClaudeContent = async (params: {
  prompt: string;
  systemPrompt?: string;
  responseMimeType?: string;
  temperature?: number;
  apiKey?: string;
  model?: string;
  useWebSearch?: boolean;
}) => {
  // If in browser, call the server proxy
  if (typeof window !== 'undefined') {
    try {
      const secret = await getApiSecret();
      const response = await fetch('/api/ai/claude', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': secret,
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
    
    const modelId = params.model || "claude-sonnet-4-5";
    
    console.log(`[Claude] Executing with model: ${modelId}`);
    
    const response = await client.messages.create({
      model: modelId,
      max_tokens: 16000,
      temperature: params.temperature ?? 0.7,
      system: params.systemPrompt,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: params.prompt
            }
          ]
        }
      ],
      ...(params.useWebSearch ? {
        tools: [
          { type: "web_search_20250305" as any, name: "web_search", max_uses: 5 }
        ]
      } : {})
    });

    // When web search is used, Claude emits multiple text blocks interleaved with
    // search tool_use/result blocks (e.g. "I'll search for..." then the final answer
    // after results come back). Join every text block so the final structured output
    // is captured, not just the first ("I'll search...") fragment.
    const text = response.content
      .filter((block: any) => block.type === 'text')
      .map((block: any) => block.text)
      .join('\n');
    
    return {
      text,
      response
    };
  } catch (error: any) {
    console.error("Claude API Error:", error);
    const cleanError = error.message || error.error?.message || String(error);
    throw new Error(cleanError);
  }
};
