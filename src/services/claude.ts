import Anthropic from '@anthropic-ai/sdk';

console.log("[Claude Service] File loaded. Model: claude-3-5-sonnet-20241022");

let anthropicClient: Anthropic | null = null;

const getAnthropicClient = () => {
  if (anthropicClient) return anthropicClient;
  
  const apiKey = process.env.CLAUDE_API_KEY;

  if (typeof window === 'undefined') {
    if (!apiKey || apiKey === 'undefined' || apiKey === 'your-claude-api-key') {
      console.warn("SERVER: CLAUDE_API_KEY is missing or using placeholder.");
    } else {
      console.log("SERVER: CLAUDE_API_KEY is present (length: " + apiKey.length + ")");
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
  apiKey?: string; // Optional override
  model?: string;  // Optional model override
}) => {
  // If in browser, call the server proxy
  if (typeof window !== 'undefined') {
    try {
      const response = await fetch('/api/ai/claude', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
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
    
    console.log(`[CLAUDE_SERVER_V4] Executing with model: ${modelId}`);
    
    const response = await client.messages.create({
      model: modelId,
      max_tokens: 4096,
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
    });

    const text = response.content.find(block => block.type === 'text')?.text || '';
    
    return {
      text,
      response
    };
  } catch (error: any) {
    console.error("Claude API Error:", error);
    // Extract the most useful error message
    const cleanError = error.message || error.error?.message || String(error);
    throw new Error(cleanError);
  }
};
