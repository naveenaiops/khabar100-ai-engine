import { GoogleGenerativeAI } from "@google/generative-ai";

/**
 * OpenRouter & Gemini API Client Gateway
 * Portfolio Edition: Features elegant mock-fallbacks to allow the local UI and 
 * development servers to run gracefully even without active third-party API credentials.
 */

const getApiKey = () => process.env.OPENROUTER_API_KEY || "";
const getGeminiApiKey = () => process.env.GEMINI_API_KEY || "";

const getGenerationModel = () => process.env.OPENROUTER_GENERATION_MODEL || "google/gemini-2.5-flash";
const getValidationModel = () => process.env.OPENROUTER_VALIDATION_MODEL || "google/gemini-2.5-flash-lite";

/**
 * Executes a Chat Completion request through OpenRouter.
 * Features a high-fidelity mock fallback if OPENROUTER_API_KEY is not configured.
 */
export async function completeChat(
  prompt: string,
  systemPrompt?: string,
  modelTypeOrModel: "generation" | "validation" | string = "generation"
): Promise<string> {
  const apiKey = getApiKey();
  
  if (!apiKey) {
    console.warn("⚠️ OPENROUTER_API_KEY is missing. Operating in PORTFOLIO SANDBOX MODE. Returning high-fidelity mock completions.");
    
    // Simulate slight network delay for natural feel
    await new Promise((resolve) => setTimeout(resolve, 800));

    // Return realistic mocked UPSC question generation output in structured JSON format
    return JSON.stringify({
      topic_title: "Mock UPSC Current Affairs Topic",
      question_type: "multi_statement",
      subject_tag: "Polity & Governance",
      question_text: "Consider the following statements regarding the Inter-State Council in India:\n1. It is a permanent constitutional body established under Article 263 of the Constitution.\n2. The Prime Minister of India acts as the Chairman of the Council.\n3. The recommendations of the Council are binding on the Union Cabinet.",
      options: {
        A: "1 and 2 only",
        B: "2 only",
        C: "2 and 3 only",
        D: "1, 2 and 3"
      },
      correct_option: "B",
      explanation: "Statement 1 is incorrect: The Inter-State Council is NOT a permanent constitutional body; it can be established 'at any time' by the President if it appears that public interest would be served. Statement 2 is correct: The Prime Minister is the Chairman of the Inter-State Council. Statement 3 is incorrect: The recommendations of the Council are advisory in nature and not binding.",
      reasoning_type: "similar",
      reasoning_detail: "Historically aligned with questions asked in UPSC Prelims 2013 and 2017 focusing on Centre-State relationships and Article 263 statutory operations."
    });
  }

  let model = "";
  if (modelTypeOrModel === "generation") {
    model = getGenerationModel();
  } else if (modelTypeOrModel === "validation") {
    model = getValidationModel();
  } else {
    model = modelTypeOrModel;
  }
  
  const messages: any[] = [];
  if (systemPrompt) {
    messages.push({ role: "system", content: systemPrompt });
  }
  messages.push({ role: "user", content: prompt });

  const modelAttempts = [
    model,
    "google/gemini-2.5-flash", 
    "google/gemini-2.5-flash-lite", 
  ];

  let lastError: any = null;

  for (const currentModel of modelAttempts) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 25000); // 25 seconds timeout

    try {
      console.log(`[OpenRouter API Gateway] Sending request to ${currentModel}...`);
      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
          "HTTP-Referer": process.env.NEXT_PUBLIC_SITE_URL || "https://github.com/portfolio/khabar100",
          "X-Title": "Khabar100 Portfolio Edition",
        },
        body: JSON.stringify({
          model: currentModel,
          messages: messages,
          temperature: 0.1,
          response_format: { type: "json_object" },
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Status ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content;
      if (!content) {
        throw new Error("Empty response returned from provider.");
      }

      return content;
    } catch (error: any) {
      clearTimeout(timeoutId);
      const isTimeout = error.name === "AbortError";
      const errorMsg = isTimeout ? "Timeout (25s)" : error.message;
      console.warn(`⚠️ OpenRouter attempt failed for ${currentModel}: ${errorMsg}. Trying fallback...`);
      lastError = error;
    }
  }

  throw new Error(`All OpenRouter model attempts failed. Last error: ${lastError?.message || "Unknown error"}`);
}

/**
 * Generates 768-dimensional vector embedding for an input string.
 * Prioritizes OpenRouter's openai/text-embedding-3-small (Matryoshka dimension trimming to 768)
 * and falls back to native Gemini.
 * Features a high-fidelity mock fallback if no API keys are provided.
 */
export async function getEmbedding(text: string): Promise<number[]> {
  const cleanText = text.replace(/\n/g, " ");

  const openRouterKey = getApiKey();
  const geminiKey = getGeminiApiKey();

  // If no credentials exist, return a mock 768-dimensional normalized unit vector
  if (!openRouterKey && !geminiKey) {
    console.warn("⚠️ No Embedding API Keys found. Returning structured mock 768-dimensional unit vector.");
    const mockVector = new Array(768).fill(0).map(() => Math.random() - 0.5);
    // Normalize vector to unit length
    const magnitude = Math.sqrt(mockVector.reduce((sum, val) => sum + val * val, 0));
    return mockVector.map((val) => val / magnitude);
  }

  // 1. OpenRouter API with openai/text-embedding-3-small
  if (openRouterKey) {
    try {
      const response = await fetch("https://openrouter.ai/api/v1/embeddings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${openRouterKey}`,
        },
        body: JSON.stringify({
          model: "openai/text-embedding-3-small",
          input: cleanText,
          dimensions: 768, 
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const embedding = data.data?.[0]?.embedding;
        if (embedding && Array.isArray(embedding) && embedding.length === 768) {
          return embedding;
        }
      } else {
        const errorText = await response.text();
        console.warn("⚠️ OpenRouter OpenAI embedding failed, falling back to Native Gemini:", errorText);
      }
    } catch (err: any) {
      console.warn("⚠️ OpenRouter OpenAI embedding exception, falling back to Native Gemini:", err.message);
    }
  }

  // 2. Native Gemini API Fallback
  if (geminiKey) {
    try {
      const genAI = new GoogleGenerativeAI(geminiKey);
      const model = genAI.getGenerativeModel({ model: "text-embedding-004" });
      const result = await model.embedContent(cleanText);
      if (result.embedding?.values) {
        return result.embedding.values;
      }
    } catch (err: any) {
      console.error("❌ Native Gemini embedding failed:", err.message);
    }
  }

  throw new Error("No embedding models succeeded. Please verify your OpenRouter/Gemini API keys and internet connection.");
}
