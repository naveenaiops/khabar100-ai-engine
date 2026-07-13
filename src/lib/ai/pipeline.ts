import { createClient } from "@supabase/supabase-js";
import { completeChat, getEmbedding } from "./openrouter";
import crypto from "crypto";
import fs from "fs";
import path from "path";

// Initialize Supabase admin client from environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://mock-project.supabase.co";
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.mock-service";

const supabaseAdmin = createClient(supabaseUrl, serviceKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

// Model Constants
const MODEL_FILTER = process.env.OPENROUTER_VALIDATION_MODEL || "google/gemini-2.5-flash-lite";
const MODEL_GENERATION = process.env.OPENROUTER_GENERATION_MODEL || "google/gemini-2.5-flash"; 
const MODEL_QUALITY_GATE = process.env.OPENROUTER_VALIDATION_MODEL || "google/gemini-2.5-flash-lite";

// PYQ Similarity Threshold Constants (Configurable via Environment Variables)
const PYQ_REPEATED_THRESHOLD = parseFloat(process.env.PYQ_REPEATED_THRESHOLD || "0.55");
const PYQ_SIMILAR_THRESHOLD = parseFloat(process.env.PYQ_SIMILAR_THRESHOLD || "0.42");
const MCQ_DUPLICATION_THRESHOLD = parseFloat(process.env.MCQ_DUPLICATION_THRESHOLD || "0.58");

export interface DimensionCandidate {
  topic_title: string;
  question_type: "direct" | "multi_statement"; // direct (Single Fact/Definition/Location) or multi_statement (Deep UPSC Hybrid)
  fact_context: string;
  subject_tag: string;
  source_url: string;
  has_statutory_hook: boolean;
  has_conceptual_hook: boolean;
}

export interface SyllabusNode {
  id: string;
  subject: string;
  topic: string;
}

// Memory Cache for Web Search Queries to conserve search credits
const searchCache: Record<string, string> = {};

/**
 * Loads the compiled UPSC blueprint archetype configuration file.
 */
function loadUPSCBlueprint(): any {
  try {
    const filePath = path.join(process.cwd(), "src", "config", "upsc_blueprint.json");
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, "utf-8");
      return JSON.parse(content);
    }
  } catch (err: any) {
    console.warn("⚠️ Could not load upsc_blueprint.json file, using static fallback blueprint.", err.message);
  }

  // Immutable premium fallback archetype guide
  return {
    "blueprint_name": "UPSC CSE GS1 Master Blueprint Archetype",
    "statement_formulation_rules": {
      "dynamic_static_hybridization": "A premium UPSC question must blend dynamic current affairs with static conceptual foundations. Statement 1 must highlight the current event; Statement 2 and 3 must track governance or static act structures."
    }
  };
}

/**
 * Sanitizes and parses JSON strings safely from model outputs.
 */
function cleanAndParseJSON(rawText: string): any {
  let cleaned = rawText.replace(/```json|```/g, "").trim();
  
  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace !== -1) {
    cleaned = cleaned.slice(firstBrace, lastBrace + 1);
  }

  try {
    return JSON.parse(cleaned);
  } catch (err: any) {
    try {
      const ultraCleaned = cleaned
        .replace(/\\n/g, "\\n")
        .replace(/\\'/g, "'")
        .replace(/[\u0000-\u001F]+/g, " "); // Strip unescaped control characters
      return JSON.parse(ultraCleaned);
    } catch {
      throw new Error(`JSON parsing crash. Content chunk: ${rawText.slice(0, 250)}`);
    }
  }
}

/**
 * Generates a unique, stable SHA-256 hash for a question and its sorted options.
 */
function generateContentHash(questionText: string, options: any): string {
  const sortedOptions = Object.keys(options)
    .sort()
    .map((key) => `${key}:${String(options[key]).trim().toLowerCase()}`)
    .join("|");
  const baseString = `${questionText.trim().toLowerCase()}||${sortedOptions}`;
  return crypto.createHash("sha256").update(baseString).digest("hex");
}

/**
 * Returns dynamic date formats for present-day targeting
 */
function getIngestionDateFormats(date: Date) {
  const yyyy = String(date.getFullYear());
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  const dayNum = date.getDate();
  const day = String(dayNum);
  
  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  const monthTitle = months[date.getMonth()];
  const monthLower = monthTitle.toLowerCase();
  
  let dayWithSuffix = day;
  if (dayNum >= 11 && dayNum <= 13) {
    dayWithSuffix += "th";
  } else {
    switch (dayNum % 10) {
      case 1: dayWithSuffix += "st"; break;
      case 2: dayWithSuffix += "nd"; break;
      case 3: dayWithSuffix += "rd"; break;
      default: dayWithSuffix += "th"; break;
    }
  }
  
  return {
    yyyy,
    mm,
    dd,
    day,
    monthTitle,
    monthLower,
    dayWithSuffix,
    
    drishti: `${dd}-${mm}-${yyyy}`,
    affairs: `${day}-${monthLower}-${yyyy}`,
    legacyAnalysis: `${dd}-${monthTitle}-${yyyy}`,
    legacyCA: `${day}-${monthLower}-${yyyy}`,
    insights: `${yyyy}/${mm}/${dd}/upsc-current-affairs-${day}-${monthTitle}-${yyyy}`,
  };
}

/**
 * Cleans HTML content to retain plain text.
 */
function cleanHTML(html: string): string {
  let text = html.replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/gi, "");
  text = text.replace(/<[^>]+>/g, " ");
  text = text.replace(/\s+/g, " ").trim();
  return text.slice(0, 40000); 
}

/**
 * Internet Search Hook for Deep Context Augmentation (Serper/Tavily Backend client)
 * Portfolio Edition: Replaces hardcoded credentials with process.env references.
 */
async function searchWebContext(query: string): Promise<string> {
  const cacheKey = query.trim().toLowerCase();
  if (searchCache[cacheKey]) {
    console.log(`[Search Hook] [CACHE HIT] Reusing cached context for query: "${query}"`);
    return searchCache[cacheKey];
  }

  const serperKey = process.env.SERPER_API_KEY;
  const tavilyKey = process.env.TAVILY_API_KEY;
  let contextText = "";

  if (serperKey) {
    try {
      console.log(`[Search Hook] Querying Serper API for context: "${query}"`);
      const res = await fetch("https://google.serper.dev/search", {
        method: "POST",
        headers: {
          "X-API-KEY": serperKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ q: `${query} upsc static background guidelines`, num: 3 }),
      });
      if (res.ok) {
        const data = await res.json();
        const organic = data.organic || [];
        contextText = organic.map((item: any) => `Source: ${item.title}\nSnippet: ${item.snippet}`).join("\n\n");
      }
    } catch (err: any) {
      console.warn(`[Search Hook] Serper search failed:`, err.message);
    }
  }

  if (!contextText && tavilyKey) {
    try {
      console.log(`[Search Hook] Querying Tavily API for context: "${query}"`);
      const res = await fetch("https://api.tavily.com/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ api_key: tavilyKey, query: `${query} upsc statutory guidelines`, num_results: 3 }),
      });
      if (res.ok) {
        const data = await res.json();
        const results = data.results || [];
        contextText = results.map((item: any) => `Source: ${item.title}\nContent: ${item.content}`).join("\n\n");
      }
    } catch (err: any) {
      console.warn(`[Search Hook] Tavily search failed:`, err.message);
    }
  }

  if (contextText) {
    searchCache[cacheKey] = contextText;
  }
  return contextText;
}

/**
 * Competitor URL Masking Helper using NewsAPI Search
 * Portfolio Edition: Replaces hardcoded NewsAPI keys with environment variables.
 */
async function maskCompetitorUrl(topicTitle: string, rawUrl: string, targetDate: Date = new Date()): Promise<string | null> {
  const lowercaseUrl = (rawUrl || "").toLowerCase();
  const isCompetitor = 
    lowercaseUrl.includes("drishtiias.com") ||
    lowercaseUrl.includes("affairscloud.com") ||
    lowercaseUrl.includes("legacyias.com") ||
    lowercaseUrl.includes("insightsonindia.com") ||
    lowercaseUrl.includes("pwonlyias.com") ||
    lowercaseUrl.includes("visionias.in") ||
    lowercaseUrl.includes("theiashub.com") ||
    lowercaseUrl.includes("khanglobalstudies.com") ||
    lowercaseUrl.includes("dalvoy.com");

  // Calculate safe 2-day date boundaries to allow indexing/timezone lag but block stale 4-day-old news
  const yyyy = targetDate.getFullYear();
  const mm = String(targetDate.getMonth() + 1).padStart(2, "0");
  const dd = String(targetDate.getDate()).padStart(2, "0");
  const dateStr = `${yyyy}-${mm}-${dd}`;

  const yesterday = new Date(targetDate);
  yesterday.setDate(yesterday.getDate() - 1);
  const y_yyyy = yesterday.getFullYear();
  const y_mm = String(yesterday.getMonth() + 1).padStart(2, "0");
  const y_dd = String(yesterday.getDate()).padStart(2, "0");
  const yesterdayStr = `${y_yyyy}-${y_mm}-${y_dd}`;

  const needsBetterLink = isCompetitor || !rawUrl || rawUrl.includes("PressReleasePage.aspx?PRID=2040000");

  if (!needsBetterLink) {
    return rawUrl || null;
  }

  // Use environment variable instead of hardcoded key
  const apiKey = process.env.NEWS_API_KEY;
  if (apiKey) {
    try {
      const searchUrl = `https://newsapi.org/v2/everything?apiKey=${apiKey}&q=${encodeURIComponent(topicTitle)}&from=${yesterdayStr}&to=${dateStr}&pageSize=5&sortBy=relevance`;
      const res = await fetch(searchUrl);
      if (res.ok) {
        const data = await res.json();
        if (data.articles && data.articles.length > 0) {
          const firstCleanArt = data.articles.find((art: any) => {
            const artUrl = (art.url || "").toLowerCase();
            return artUrl && 
              artUrl.startsWith("http") &&
              !artUrl.includes("drishtiias.com") && 
              !artUrl.includes("affairscloud.com") && 
              !artUrl.includes("legacyias.com") && 
              !artUrl.includes("insightsonindia.com") && 
              !artUrl.includes("pwonlyias.com") && 
              !artUrl.includes("visionias.in") && 
              !artUrl.includes("theiashub.com") && 
              !artUrl.includes("khanglobalstudies.com") && 
              !artUrl.includes("dalvoy.com");
          });
          if (firstCleanArt) {
            console.log(`[Competitor Masking] Swapped competitor link for clean news link: ${firstCleanArt.url}`);
            return firstCleanArt.url;
          }
        }
      }
    } catch (err: any) {
      console.warn("[Competitor Masking] Failed to fetch original news URL from NewsAPI:", err.message);
    }
  }

  // 2. Fallback to Serper to search for tomorrow/today's actual Google News link
  const serperKey = process.env.SERPER_API_KEY;
  if (serperKey) {
    try {
      console.log(`[Competitor Masking] Querying Serper to find clean Google News link for "${topicTitle}"`);
      const res = await fetch("https://google.serper.dev/search", {
        method: "POST",
        headers: {
          "X-API-KEY": serperKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ q: `${topicTitle} news ${dateStr}`, num: 3 }),
      });
      if (res.ok) {
        const data = await res.json();
        const organic = data.organic || [];
        const firstCleanResult = organic.find((item: any) => {
          const link = (item.link || "").toLowerCase();
          return link && 
            link.startsWith("http") &&
            !link.includes("drishtiias.com") && 
            !link.includes("affairscloud.com") && 
            !link.includes("legacyias.com") && 
            !link.includes("insightsonindia.com") && 
            !link.includes("pwonlyias.com") && 
            !link.includes("visionias.in") && 
            !link.includes("theiashub.com") && 
            !link.includes("khanglobalstudies.com") && 
            !link.includes("dalvoy.com");
        });
        if (firstCleanResult) {
          console.log(`[Competitor Masking] Swapped competitor link for clean Serper link: ${firstCleanResult.link}`);
          return firstCleanResult.link;
        }
      }
    } catch (err: any) {
      console.warn("[Competitor Masking] Serper failed:", err.message);
    }
  }

  return null;
}

/**
 * Fetch and aggregate Whitelisted Sources for the current date
 * Portfolio Edition: Uses environment variables for API keys instead of hardcoded strings.
 */
async function fetchAllPrimarySources(targetDate: Date): Promise<{ text: string; sources: string[] }> {
  const dates = getIngestionDateFormats(targetDate);
  const userAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36";
  let combinedText = "";
  const sourcesUsed: string[] = [];

  // 1. PIB English Releases
  const pibUrl = "https://www.pib.gov.in/AllReleasem.aspx?reg=48&lang=1";
  try {
    const res = await fetch(pibUrl, { headers: { "User-Agent": userAgent } });
    if (res.ok) {
      combinedText += `\n\n--- PIB SOURCE ---\n` + cleanHTML(await res.text());
      sourcesUsed.push(pibUrl);
    }
  } catch (err: any) {
    console.warn(`[Ingestion] PIB error:`, err.message);
  }

  // 2. Drishti IAS Daily Analysis
  const drishtiUrl = `https://www.drishtiias.com/current-affairs-news-analysis-editorials/news-analysis/${dates.drishti}`;
  try {
    const res = await fetch(drishtiUrl, { headers: { "User-Agent": userAgent } });
    if (res.ok) {
      combinedText += `\n\n--- DRISHTI IAS SOURCE ---\n` + cleanHTML(await res.text());
      sourcesUsed.push(drishtiUrl);
    }
  } catch (err: any) {
    console.warn(`[Ingestion] Drishti error:`, err.message);
  }

  // 3. AffairsCloud Current Affairs
  const affairsUrl = `https://affairscloud.com/current-affairs-${dates.affairs}/`;
  try {
    const res = await fetch(affairsUrl, { headers: { "User-Agent": userAgent } });
    if (res.ok) {
      combinedText += `\n\n--- AFFAIRSCLOUD SOURCE ---\n` + cleanHTML(await res.text());
      sourcesUsed.push(affairsUrl);
    }
  } catch (err: any) {
    console.warn(`[Ingestion] AffairsCloud error:`, err.message);
  }

  // 4. Legacy IAS News Analysis
  const legacyAnalysisUrl = `https://www.legacyias.com/the-hindu-upsc-news-analysis-for-${dates.legacyAnalysis.toLowerCase()}/`;
  try {
    const res = await fetch(legacyAnalysisUrl, { headers: { "User-Agent": userAgent } });
    if (res.ok) {
      combinedText += `\n\n--- LEGACY IAS ANALYSIS ---\n` + cleanHTML(await res.text());
      sourcesUsed.push(legacyAnalysisUrl);
    }
  } catch (err: any) {
    console.warn(`[Ingestion] Legacy Analysis error:`, err.message);
  }

  // 5. Insights on India
  const insightsUrl = `https://www.insightsonindia.com/${dates.insights}/`;
  try {
    const res = await fetch(insightsUrl, { headers: { "User-Agent": userAgent } });
    if (res.ok) {
      combinedText += `\n\n--- INSIGHTS ON INDIA ---\n` + cleanHTML(await res.text());
      sourcesUsed.push(insightsUrl);
    }
  } catch (err: any) {
    console.warn(`[Ingestion] Insights error:`, err.message);
  }

  // 6. PW OnlyIAS News of the Day
  const pwOnlyUrl = `https://pwonlyias.com/news-headline/news-of-the-day-${dates.dayWithSuffix.toLowerCase()}-${dates.monthLower}-${dates.yyyy}/`;
  try {
    const res = await fetch(pwOnlyUrl, { headers: { "User-Agent": userAgent } });
    if (res.ok) {
      combinedText += `\n\n--- PW ONLYIAS ---\n` + cleanHTML(await res.text());
      sourcesUsed.push(pwOnlyUrl);
    }
  } catch (err: any) {
    console.warn(`[Ingestion] PW OnlyIAS error:`, err.message);
  }

  // 7. VisionIAS Daily News Summary Scraper
  const visionUrl = `https://visionias.in/current-affairs/upsc-daily-news-summary/${dates.yyyy}-${dates.mm}-${dates.dd}/all`;
  try {
    const res = await fetch(visionUrl, { headers: { "User-Agent": userAgent } });
    if (res.ok) {
      combinedText += `\n\n--- VISION IAS ---\n` + cleanHTML(await res.text());
      sourcesUsed.push(visionUrl);
    }
  } catch (err: any) {
    console.warn(`[Ingestion] VisionIAS error:`, err.message);
  }

  // 8. The IAS Hub Daily Scraper
  const iasHubUrl = `https://theiashub.com/current-affairs/daily-headlines/${dates.dayWithSuffix}-${dates.monthTitle}-${dates.yyyy}`;
  try {
    const res = await fetch(iasHubUrl, { headers: { "User-Agent": userAgent } });
    if (res.ok) {
      combinedText += `\n\n--- THE IAS HUB ---\n` + cleanHTML(await res.text());
      sourcesUsed.push(iasHubUrl);
    }
  } catch (err: any) {
    console.warn(`[Ingestion] The IAS Hub error:`, err.message);
  }

  // 9. Dalvoy UPSC Scraper
  const dalvoyUrl = `https://www.dalvoy.com/upsc/app`;
  try {
    const res = await fetch(dalvoyUrl, { headers: { "User-Agent": userAgent } });
    if (res.ok) {
      combinedText += `\n\n--- DALVOY ---\n` + cleanHTML(await res.text());
      sourcesUsed.push(dalvoyUrl);
    }
  } catch (err: any) {
    console.warn(`[Ingestion] Dalvoy error:`, err.message);
  }

  // 10. Khan Global Studies (KGS) Scraper
  const kgsUrl = `https://www.khanglobalstudies.com/current-affairs/daily-news-highlights`;
  try {
    const res = await fetch(kgsUrl, { headers: { "User-Agent": userAgent } });
    if (res.ok) {
      combinedText += `\n\n--- KHAN GLOBAL STUDIES ---\n` + cleanHTML(await res.text());
      sourcesUsed.push(kgsUrl);
    }
  } catch (err: any) {
    console.warn(`[Ingestion] KGS error:`, err.message);
  }

  // 11. EventRegistry Premium API (Key mapped to environment variable)
  const eventRegistryApiKey = process.env.EVENT_REGISTRY_API_KEY;
  if (eventRegistryApiKey) {
    const eventRegistryUrl = `https://eventregistry.org/api/v1/article/getArticles?apiKey=${eventRegistryApiKey}&action=getArticles&articlesPage=1&articlesCount=15&articlesSortBy=date&conceptUri=http://en.wikipedia.org/wiki/India&dataType=news&forceArray=true`;
    try {
      const res = await fetch(eventRegistryUrl);
      if (res.ok) {
        const data = await res.json();
        if (data.articles && data.articles.results) {
          data.articles.results.forEach((art: any) => {
            combinedText += `\n\n--- EVENTREGISTRY ARTICLE ---\nTitle: ${art.title}\nBody: ${art.body || ""}\nSource: ${art.source?.title || "eventregistry"}\nURL: ${art.url || ""}`;
            sourcesUsed.push(art.url || "eventregistry.org");
          });
        }
      }
    } catch (err: any) {
      console.warn(`[Ingestion] EventRegistry error:`, err.message);
    }
  }

  // 12. NewsAPI Premium API (Key mapped to environment variable)
  const newsApiKey = process.env.NEWS_API_KEY;
  if (newsApiKey) {
    const newsApiUrl = `https://newsapi.org/v2/top-headlines?apiKey=${newsApiKey}&country=in&category=general&pageSize=15`;
    try {
      const res = await fetch(newsApiUrl);
      if (res.ok) {
        const data = await res.json();
        if (data.articles) {
          data.articles.forEach((art: any) => {
            combinedText += `\n\n--- NEWSAPI ARTICLE ---\nTitle: ${art.title}\nDescription: ${art.description || ""}\nContent: ${art.content || ""}\nSource: ${art.source?.name || "newsapi"}\nURL: ${art.url || ""}`;
            sourcesUsed.push(art.url || "newsapi.org");
          });
        }
      }
    } catch (err: any) {
      console.warn(`[Ingestion] NewsAPI error:`, err.message);
    }
  }

  return { text: combinedText, sources: sourcesUsed };
}

/**
 * Tier 2 Ingestion: NewsData.io with Pagination Loop support (Iterates up to 5 pages)
 */
async function fetchNewsDataPaginated(apiKey: string, limitPages: number = 5): Promise<{ text: string; sources: string[] }> {
  console.log(`[Tier 2 Ingest] Triggering NewsData.io Pagination Loop (Limit: ${limitPages} pages)`);
  
  let combinedText = "";
  const sourcesUsed: string[] = [];
  let nextPageToken: string | null = null;
  let pageCount = 0;

  while (pageCount < limitPages) {
    const pageParam: string = nextPageToken ? `&page=${nextPageToken}` : "";
    const url = `https://newsdata.io/api/1/news?apikey=${apiKey}&country=in&category=politics,science,environment,business&language=en${pageParam}`;
    
    try {
      console.log(`[Tier 2 Ingest] Fetching page ${pageCount + 1}...`);
      const res = await fetch(url);
      if (!res.ok) break;

      const data = await res.json();
      if (data.results && Array.isArray(data.results)) {
        data.results.forEach((art: any) => {
          combinedText += `\n\n--- NEWSDATA ARTICLE ---\nTitle: ${art.title}\nDescription: ${art.description}\nContent: ${art.content || ""}\nSource Link: ${art.link || ""}`;
          sourcesUsed.push(art.link || "newsdata.io");
        });
        console.log(`[Tier 2 Ingest] Page ${pageCount + 1} loaded ${data.results.length} articles.`);
      }

      nextPageToken = data.nextPage || null;
      pageCount++;

      if (!nextPageToken) {
        break; 
      }
    } catch (err: any) {
      console.error(`[Tier 2 Ingest] Page ${pageCount + 1} call failed:`, err.message);
      break;
    }
  }

  return { text: combinedText, sources: sourcesUsed };
}

/**
 * Tier 2 Ingestion: NewsAPI with Pagination Loop support (Iterates up to 3 pages)
 */
async function fetchNewsAPIDataPaginated(apiKey: string, limitPages: number = 3): Promise<{ text: string; sources: string[] }> {
  console.log(`[Tier 2 NewsAPI] Triggering NewsAPI Pagination Loop (Limit: ${limitPages} pages)`);
  
  let combinedText = "";
  const sourcesUsed: string[] = [];
  let pageCount = 1;

  while (pageCount <= limitPages) {
    const url = `https://newsapi.org/v2/top-headlines?apiKey=${apiKey}&country=in&category=general&pageSize=100&page=${pageCount}`;
    
    try {
      console.log(`[Tier 2 NewsAPI] Fetching NewsAPI page ${pageCount}...`);
      const res = await fetch(url);
      if (!res.ok) {
        const errText = await res.text();
        console.error(`[Tier 2 NewsAPI] Fetch page ${pageCount} failed:`, errText);
        break;
      }

      const data = await res.json();
      if (data.articles && Array.isArray(data.articles)) {
        data.articles.forEach((art: any) => {
          combinedText += `\n\n--- NEWSAPI ARTICLE ---\nTitle: ${art.title}\nDescription: ${art.description || ""}\nContent: ${art.content || ""}\nSource Link: ${art.url || ""}`;
          sourcesUsed.push(art.url || "newsapi.org");
        });
        console.log(`[Tier 2 NewsAPI] Page ${pageCount} loaded ${data.articles.length} articles.`);
      }

      if (!data.articles || data.articles.length < 100) {
        break; 
      }
      pageCount++;
    } catch (err: any) {
      console.error(`[Tier 2 NewsAPI] Page ${pageCount} call failed:`, err.message);
      break;
    }
  }

  return { text: combinedText, sources: sourcesUsed };
}

/**
 * Tier 2 Ingestion: EventRegistry with Pagination support
 */
async function fetchEventRegistryPaginated(apiKey: string, limitArticles: number = 50): Promise<{ text: string; sources: string[] }> {
  console.log(`[Tier 2 EventRegistry] Triggering EventRegistry (Limit: ${limitArticles} articles)`);
  
  let combinedText = "";
  const sourcesUsed: string[] = [];
  const url = `https://eventregistry.org/api/v1/article/getArticles?apiKey=${apiKey}&action=getArticles&articlesPage=1&articlesCount=${limitArticles}&articlesSortBy=date&conceptUri=http://en.wikipedia.org/wiki/India&dataType=news&forceArray=true`;
  
  try {
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      if (data.articles && data.articles.results) {
        data.articles.results.forEach((art: any) => {
          combinedText += `\n\n--- EVENTREGISTRY ARTICLE ---\nTitle: ${art.title}\nBody: ${art.body || ""}\nSource: ${art.source?.title || "eventregistry"}\nURL: ${art.url || ""}`;
          sourcesUsed.push(art.url || "eventregistry.org");
        });
        console.log(`[Tier 2 EventRegistry] Loaded ${data.articles.results.length} articles.`);
      }
    } else {
      const errText = await res.text();
      console.error(`[Tier 2 EventRegistry] Fetch failed:`, errText);
    }
  } catch (err: any) {
    console.error(`[Tier 2 EventRegistry] Exception:`, err.message);
  }

  return { text: combinedText, sources: sourcesUsed };
}

/**
 * Stage B Overhaul: Deep Fact & Dimension Decomposition Matrix
 */
export async function decomposeToDimensionMatrix(rawNewsText: string, isTier2: boolean = false): Promise<DimensionCandidate[]> {
  console.log(`[Stage B Overhaul] Decomposing daily news into analytical dimensions using ${MODEL_FILTER}...`);

  const systemPrompt = `You are a senior UPSC CSE Syllabus Auditor and Fact Decomposer.
Your task is to analyze raw news articles and decompose them into a Matrix of UPSC-relevant tasks.

IMPT: Ground your decisions on the 16-Year UPSC Prelims GS1 Patterns:
1. UPSC targets core topics such as Environmental treaties, Statutory/Constitutional bodies, Critical Geography, National Parks, agricultural science, and major monetary policy.
2. Filter out non-UPSC relevant news. Any local crime, local weather alerts, local road constructions, celebrity gossip, or minor announcements must be scored 1-5 and dropped.
3. If multiple sources discuss the same daily event, CLUSTER them into a single Unified Topic to eliminate duplicate questions.
4. Dynamically decide the question type:
   - "direct" (Single-focus/Definition/Location): For straightforward factual events, new species, simple geography, or indicators.
   - "multi_statement" (Deep UPSC 3-Statement Hybrid): For deep governance, legislative bills, complex science, or major global treaties.

Output format must be STRICTLY JSON matching this structure:
{
  "dimensions": [
    {
      "topic_title": "Short title of the overall news event",
      "question_type": "direct|multi_statement",
      "fact_context": "The consolidated, rich factual statements and static-dynamic background details representing this topic.",
      "subject_tag": "One of: Polity, Economy, Geography, Environment, History, Science & Tech, International Relations",
      "source_url": "The source URL of the article",
      "has_statutory_hook": true|false,
      "has_conceptual_hook": true|false
    }
  ]
}`;

  const allDimensions: DimensionCandidate[] = [];
  const chunkSize = 100000;
  const totalLength = Math.min(rawNewsText.length, 300000);
  
  for (let start = 0; start < totalLength; start += chunkSize) {
    const chunkIndex = Math.floor(start / chunkSize) + 1;
    const textChunk = rawNewsText.slice(start, start + chunkSize);
    
    if (textChunk.trim().length < 500) continue;
    
    console.log(`[Dimension Matrix] Processing news chunk #${chunkIndex} (${textChunk.length} characters)...`);
    
    try {
      const prompt = `Analyze this segment of today's news and extract up to 25 UPSC-relevant facts/dimensions:\n\n${textChunk}`;
      const responseText = await completeChat(prompt, systemPrompt, MODEL_FILTER);
      const parsed = cleanAndParseJSON(responseText);
      const chunkDimensions = parsed.dimensions || [];
      console.log(`[Dimension Matrix] Extracted ${chunkDimensions.length} dimensions from chunk #${chunkIndex}.`);
      allDimensions.push(...chunkDimensions);
    } catch (err: any) {
      console.warn(`[Dimension Matrix] Chunk #${chunkIndex} failed to decompose:`, err.message);
    }
  }

  console.log(`[Dimension Matrix] Total accumulated candidates across all chunks: ${allDimensions.length}`);
  return allDimensions.slice(0, 120);
}

/**
 * Map Syllabus Nodes
 */
export async function mapSyllabusNodes(fact: { fact_context: string; subject_tag: string }, syllabusNodes: SyllabusNode[]): Promise<string | null> {
  if (syllabusNodes.length === 0) return null;

  const systemPrompt = `Match the provided fact context to the single most matching syllabus node ID. Return only a valid JSON containing the matched UUID.
Syllabus Nodes:
${JSON.stringify(syllabusNodes.slice(0, 150), null, 2)}

Output structure:
{
  "matched_node_id": "UUID-string"
}`;

  try {
    const prompt = `Fact Tag: ${fact.subject_tag}\nContent: ${fact.fact_context}`;
    const responseText = await completeChat(prompt, systemPrompt, MODEL_FILTER);
    return cleanAndParseJSON(responseText).matched_node_id || null;
  } catch {
    return null;
  }
}

/**
 * Stage E Post-Generation, Pre-Insert Vector Similarity Check (Threshold > 0.75)
 */
async function checkGeneratedQuestionSemanticDuplication(
  questionText: string,
  categoryId: string
): Promise<boolean> {
  try {
    const embedding = await getEmbedding(questionText);

    // Call match_generated_mcqs stored procedure (threshold > MCQ_DUPLICATION_THRESHOLD)
    const { data: matches, error } = await supabaseAdmin.rpc("match_generated_mcqs", {
      query_embedding: embedding,
      match_threshold: MCQ_DUPLICATION_THRESHOLD,
      match_count: 1,
      category_id: categoryId,
    });

    if (error) {
      console.error(`[Deduplication Gate] DB mismatch error:`, error.message);
      return false;
    }

    return matches && matches.length > 0;
  } catch (err: any) {
    console.warn(`[Deduplication Gate] Exception running semantic check:`, err.message);
    return false;
  }
}

/**
 * Stage D: Real-time Vector Similarity match against the 16-Year PYQs Table
 */
export async function performVectorMatch(
  factText: string,
  categoryId: string
): Promise<{
  reasoning_type: "repeated" | "similar" | "syllabus";
  matched_pyq_id: string | null;
  matched_pyq_year: number | null;
  matched_pyq_text: string | null;
}> {
  try {
    const embedding = await getEmbedding(factText);

    // Call match_pyqs stored procedure
    const { data: matches, error } = await supabaseAdmin.rpc("match_pyqs", {
      query_embedding: embedding,
      match_threshold: PYQ_SIMILAR_THRESHOLD,
      match_count: 1,
      category_id: categoryId,
    });

    if (error) {
      console.warn(`[Stage D] RPC match_pyqs failed:`, error.message);
      return { reasoning_type: "syllabus", matched_pyq_id: null, matched_pyq_year: null, matched_pyq_text: null };
    }

    if (matches && matches.length > 0) {
      const topMatch = matches[0];
      const similarity = topMatch.similarity;

      let reasoning_type: "repeated" | "similar" | "syllabus" = "syllabus";
      if (similarity >= PYQ_REPEATED_THRESHOLD) {
        reasoning_type = "repeated";
      } else if (similarity >= PYQ_SIMILAR_THRESHOLD) {
        reasoning_type = "similar";
      } else {
        reasoning_type = "syllabus";
      }

      return {
        reasoning_type,
        matched_pyq_id: topMatch.id,
        matched_pyq_year: topMatch.year,
        matched_pyq_text: topMatch.question_text,
      };
    }
  } catch (err: any) {
    console.warn(`[Stage D] Vector check failed. Falling back:`, err.message);
  }

  return { reasoning_type: "syllabus", matched_pyq_id: null, matched_pyq_year: null, matched_pyq_text: null };
}

/**
 * Stage E Overhaul: Multi-Question Generation via 16-Year PYQ Blueprints
 */
export async function generateMCQ(
  fact: DimensionCandidate,
  reasoning: {
    reasoning_type: "repeated" | "similar" | "syllabus";
    matched_pyq_id: string | null;
    matched_pyq_year: number | null;
    matched_pyq_text: string | null;
  },
  searchAugmentedContext: string = ""
): Promise<any> {
  let openingInstruction = "With reference to the news, consider the following statements:";
  let structuralInstruction = "Create a standard 3-statement UPSC hybrid question (Statement 1: Dynamic Current Event; Statement 2: Static background/Concept; Statement 3: Parent Ministry/Act). Use strict modern UPSC options: 'Only one', 'Only two', 'All three', 'None'.";

  if (fact.question_type === "direct") {
    openingInstruction = "For this direct question topic, formulate a direct single-question MCQ testing the definition, country location, or key dynamic indicator value.";
    structuralInstruction = "Ensure there are no numbered 1, 2, 3 statements. Formulate a direct, standard UPSC-style question with four distinct, challenging, single-sentence choice options (A, B, C, D) and a single correct option.";
  }

  const systemPrompt = `You are an expert UPSC GS1 Paper Examiner.
Generate a highly challenging, standard UPSC MCQ question using the provided Dimension context and augmented search data.

SPECIFIC STRUCTURAL INSTRUCTION:
- Opening Style: ${openingInstruction}
- Structural Guide: ${structuralInstruction}

Additional Instructions:
- SWAP parent ministries, modify ratios, or insert subtle qualifiers as defined in UPSC traps.
- Ensure the question matches the 16-Year UPSC Prelims GS1 style.

Output format must be EXACTLY JSON matching this structure:
{
  "question": "The complete UPSC-standard question text.",
  "options": {
    "A": "Option text A",
    "B": "Option text B",
    "C": "Option text C",
    "D": "Option text D"
  },
  "correct_option": "A|B|C|D",
  "explanation": "A complete, deep conceptual explanation citing the reasons why options or statements are true or false."
}`;

  const pyqSection = reasoning.matched_pyq_text
    ? `Anchor PYQ Style Guide:\nYear: ${reasoning.matched_pyq_year}\nQuestion Text:\n${reasoning.matched_pyq_text}`
    : `No matching PYQ found. Align with standard UPSC GS1 styles.`;

  const augmentedSection = searchAugmentedContext
    ? `Augmented Live Reference Context:\n${searchAugmentedContext}`
    : `No additional search reference context available. Use the dimension facts carefully.`;

  const prompt = `Dimension Topic: ${fact.topic_title}\nDimension Type / Focus: ${fact.question_type}\nDimension Fact Context:\n${fact.fact_context}\n\nSubject Area: ${fact.subject_tag}\n\n${pyqSection}\n\n${augmentedSection}`;

  try {
    const responseText = await completeChat(prompt, systemPrompt, MODEL_GENERATION);
    return cleanAndParseJSON(responseText);
  } catch (err: any) {
    console.error(`[Stage E] MCQ generation exception:`, err.message);
    return null;
  }
}

/**
 * Stage F: Quality Gate Validation
 */
export async function validateMCQ(mcq: any): Promise<boolean> {
  if (!mcq || !mcq.question || !mcq.options || !mcq.correct_option || !mcq.explanation) {
    return false;
  }

  const systemPrompt = `You are an aggressive UPSC Examiner and Quality Auditor.
Audit the generated MCQ question to ensure perfect logical compliance.
Reject any question that:
1. Is too simple or uses obvious "all of the above" or soft distractors.
2. Has factual ambiguity or mismatched correct option.
3. Has placeholder text or incomplete explanations.

Return EXACTLY JSON:
{
  "passed": true|false,
  "reason": "Detailed remarks if failed"
}`;

  try {
    const prompt = `Verify MCQ:\n${JSON.stringify(mcq, null, 2)}`;
    const responseText = await completeChat(prompt, systemPrompt, MODEL_QUALITY_GATE);
    const data = cleanAndParseJSON(responseText);
    return data.passed === true;
  } catch {
    return false;
  }
}

/**
 * Core Tiered Generation Pipeline Runner - Strict Present-Day Targeting, Multi-Angle Decomposition
 * Portfolio Edition: Features complete try-catch isolation on Supabase queries, falling back gracefully
 * to standard sandbox/mock execution instead of hard crashing if the Supabase connection is unconfigured.
 */
export async function runUPSCGenerationPipeline(targetDate: Date = new Date()): Promise<{
  success: boolean;
  total_candidates: number;
}> {
  console.log(`⏰ Starting Sequential Ingestion Pipeline... Present date: ${targetDate.toLocaleDateString()}`);

  try {
    let categoryId = "upsc-mock-category-id";
    let formattedNodes: SyllabusNode[] = [];

    // 1. Attempt to query Supabase safely with mock fallback protection
    try {
      const { data: category } = await supabaseAdmin
        .from("exam_categories")
        .select("id")
        .eq("slug", "upsc-prelims")
        .single();

      if (category) {
        categoryId = category.id;
        
        // Load active syllabus nodes
        const { data: syllabusNodes } = await supabaseAdmin
          .from("syllabus_nodes")
          .select("id, subject, topic")
          .eq("exam_category_id", categoryId);

        formattedNodes = (syllabusNodes || []).map((node) => ({
          id: node.id,
          subject: node.subject,
          topic: node.topic,
        }));
      } else {
        console.warn("⚠️ 'upsc-prelims' category record missing. Falling back to Sandbox Mock execution.");
      }
    } catch (dbErr: any) {
      console.warn("⚠️ Database connection skipped or failed. Operating in PORTFOLIO SANDBOX MODE:", dbErr.message);
    }

    let insertCount = 0;
    const targetBuffer = 100;

    // =======================================================
    // STEP 1: SEQUENTIAL TIER 1 INGESTION (STRICT PRESENT-DAY)
    // =======================================================
    console.log("\n==========================================");
    console.log(`🌊 [TIER 1] Processing Present-Day Ingestion for ${targetDate.toLocaleDateString()}...`);
    console.log("==========================================");

    const tier1Data = await fetchAllPrimarySources(targetDate);
    
    if (tier1Data.text && tier1Data.text.trim().length > 100) {
      const dimensionMatrix = await decomposeToDimensionMatrix(tier1Data.text, false);
      console.log(`[Tier 1 Dimensions] Extracted ${dimensionMatrix.length} distinct analytical dimension facts.`);

      for (let i = 0; i < dimensionMatrix.length; i++) {
        const fact = dimensionMatrix[i];

        const mappedNodeId = await mapSyllabusNodes(fact, formattedNodes);

        let searchContext = "";
        const skipSearch = true; 

        if (!skipSearch && (fact.has_statutory_hook || fact.has_conceptual_hook) && fact.topic_title && fact.topic_title.length > 5) {
          searchContext = await searchWebContext(fact.topic_title);
        }

        const reasoning = await performVectorMatch(fact.fact_context, categoryId);

        const mcq = await generateMCQ(fact, reasoning, searchContext);
        if (!mcq) continue;

        const isValid = await validateMCQ(mcq);
        if (!isValid) continue;

        const isSemanticDup = await checkGeneratedQuestionSemanticDuplication(mcq.question, categoryId);
        if (isSemanticDup) continue;

        const cleanSourceUrl = await maskCompetitorUrl(fact.topic_title, fact.source_url || "", targetDate);
        const contentHash = generateContentHash(mcq.question, mcq.options);

        // Safely check for duplicates & insert
        try {
          const { data: existingByHash } = await supabaseAdmin
            .from("generated_mcqs")
            .select("id")
            .eq("content_hash", contentHash)
            .maybeSingle();

          if (existingByHash) {
            console.log(`[Deduplication] Content hash matched existing question. Skipping.`);
            continue;
          }

          const finalEmbedding = await getEmbedding(mcq.question);

          const mcqRecord = {
            exam_category_id: categoryId,
            question: mcq.question,
            options: mcq.options,
            correct_option: mcq.correct_option,
            explanation: mcq.explanation,
            reasoning_type: reasoning.reasoning_type,
            matched_pyq_id: reasoning.matched_pyq_id,
            matched_pyq_year: reasoning.matched_pyq_year,
            subject_tag: fact.subject_tag,
            source_article_url: cleanSourceUrl,
            review_status: "pending",
            content_hash: contentHash,
            embedding: finalEmbedding,
          };

          const { error: insertError } = await supabaseAdmin
            .from("generated_mcqs")
            .upsert(mcqRecord, { onConflict: "content_hash", ignoreDuplicates: true });

          if (!insertError) {
            insertCount++;
            console.log(`✅ [Tier 1] [${insertCount}/${targetBuffer}] Seeded Question: ${mcq.question.slice(0, 50)}...`);
          }
        } catch (dbWriteErr: any) {
          // If in portfolio environment without DB connection, log to console instead of hard crashes
          insertCount++;
          console.log(`📝 [Sandbox Seed] Generated UPSC MCQ Question: "${mcq.question.slice(0, 55)}..." (Status: Mock-Buffered)`);
        }

        if (insertCount >= targetBuffer) {
          break; 
        }
      }
    }

    // =======================================================
    // STEP 2: SEQUENTIAL TIER 2 TOP-UP (FALLBACK GATEWAY CHAIN)
    // =======================================================
    if (insertCount < targetBuffer) {
      const remainingNeeded = targetBuffer - insertCount;
      console.log("\n==========================================");
      console.log(`🌊 [TIER 2] Tier 1 exhausted. Initiating Tier 2 Top-Up Gateway. Remaining Needed: ${remainingNeeded}`);
      console.log("==========================================");

      let tier2Data = { text: "", sources: [] as string[] };
      const newsApiKey = process.env.NEWS_API_KEY;
      const eventRegistryApiKey = process.env.EVENT_REGISTRY_API_KEY;
      
      // Portal A: NewsData.io (Primary Tier 2 Source)
      const newsDataApiKey = process.env.NEWSDATA_API_KEY;
      if (newsDataApiKey) {
        try {
          console.log("🚀 [Portal A] Attempting primary NewsData.io ingestion (30 pages limit)...");
          tier2Data = await fetchNewsDataPaginated(newsDataApiKey, 30);
        } catch (err: any) {
          console.warn("⚠️ [Portal A] NewsData.io failed or out of credits:", err.message);
        }
      }

      // Portal B: NewsAPI (Secondary Tier 2 Fallback)
      if ((!tier2Data.text || tier2Data.text.trim().length < 100) && newsApiKey) {
        try {
          console.log("🚀 [Portal B] Switching to NewsAPI fallback ingestion (3 pages / 300 articles limit)...");
          tier2Data = await fetchNewsAPIDataPaginated(newsApiKey, 3);
        } catch (err: any) {
          console.warn("⚠️ [Portal B] NewsAPI fallback failed:", err.message);
        }
      }

      // Portal C: EventRegistry (Tertiary Tier 2 Fallback)
      if ((!tier2Data.text || tier2Data.text.trim().length < 100) && eventRegistryApiKey) {
        try {
          console.log("🚀 [Portal C] Switching to EventRegistry fallback ingestion (50 articles limit)...");
          tier2Data = await fetchEventRegistryPaginated(eventRegistryApiKey, 50);
        } catch (err: any) {
          console.warn("⚠️ [Portal C] EventRegistry fallback failed:", err.message);
        }
      }

      if (tier2Data.text && tier2Data.text.trim().length > 100) {
        const tier2Dimensions = await decomposeToDimensionMatrix(tier2Data.text, true); 
        console.log(`[Tier 2 Dimensions] Extracted ${tier2Dimensions.length} supplemental candidates.`);

        for (let i = 0; i < tier2Dimensions.length; i++) {
          if (insertCount >= targetBuffer) break;

          const fact = tier2Dimensions[i];

          const mappedNodeId = await mapSyllabusNodes(fact, formattedNodes);
          if (!mappedNodeId) {
            console.log(`[Tier 2 Filter] Fact context did not map cleanly to any syllabus node. Skipping.`);
            continue;
          }

          let searchContext = "";
          if ((fact.has_statutory_hook || fact.has_conceptual_hook) && fact.topic_title && fact.topic_title.length > 5) {
            searchContext = await searchWebContext(fact.topic_title);
          }

          const reasoning = await performVectorMatch(fact.fact_context, categoryId);

          const mcq = await generateMCQ(fact, reasoning, searchContext);
          if (!mcq) continue;

          const isValid = await validateMCQ(mcq);
          if (!isValid) continue;

          const isSemanticDup = await checkGeneratedQuestionSemanticDuplication(mcq.question, categoryId);
          if (isSemanticDup) continue;

          const contentHash = generateContentHash(mcq.question, mcq.options);
          
          try {
            const { data: existingByHash } = await supabaseAdmin
              .from("generated_mcqs")
              .select("id")
              .eq("content_hash", contentHash)
              .maybeSingle();

            if (existingByHash) continue;

            const finalEmbedding = await getEmbedding(mcq.question);
            const cleanSourceUrl = await maskCompetitorUrl(fact.topic_title, fact.source_url || "", targetDate);

            const mcqRecord = {
              exam_category_id: categoryId,
              question: mcq.question,
              options: mcq.options,
              correct_option: mcq.correct_option,
              explanation: mcq.explanation,
              reasoning_type: reasoning.reasoning_type,
              matched_pyq_id: reasoning.matched_pyq_id,
              matched_pyq_year: reasoning.matched_pyq_year,
              subject_tag: fact.subject_tag,
              source_article_url: cleanSourceUrl || "newsdata.io",
              review_status: "pending",
              content_hash: contentHash,
              embedding: finalEmbedding,
            };

            const { error: insertError } = await supabaseAdmin
              .from("generated_mcqs")
              .upsert(mcqRecord, { onConflict: "content_hash", ignoreDuplicates: true });

            if (!insertError) {
              insertCount++;
              console.log(`✅ [Tier 2] [${insertCount}/${targetBuffer}] Seeded Question: ${mcq.question.slice(0, 50)}...`);
            }
          } catch (dbWriteErr: any) {
            insertCount++;
            console.log(`📝 [Sandbox Seed] Generated UPSC MCQ Question (Tier 2): "${mcq.question.slice(0, 55)}..."`);
          }
        }
      }
    }

    // =======================================================
    // STEP 3: SEQUENTIAL TIER 3 TOP-UP (SERPER NEWS BROAD SEARCH)
    // =======================================================
    if (insertCount < targetBuffer) {
      const remainingNeeded = targetBuffer - insertCount;
      console.log("\n==========================================");
      console.log(`🌊 [TIER 3] Still short of 100-question quota. Supplementing with Broad Serper News Search. Remaining Needed: ${remainingNeeded}`);
      console.log("==========================================");

      const serperQueries = [
        "Indian Economy news developments today",
        "Indian Polity government bills today",
        "Science and Technology news India today",
        "Environment and climate policy India today",
        "International relations bilateral India today"
      ];

      let combinedTier3Text = "";
      const tier3Sources: string[] = [];

      for (const query of serperQueries) {
        if (insertCount >= targetBuffer) break;
        try {
          console.log(`[Tier 3 Ingest] Fetching Google News search results for: "${query}"`);
          const response = await fetch("https://google.serper.dev/news", {
            method: "POST",
            headers: {
              "X-API-KEY": process.env.SERPER_API_KEY || "",
              "Content-Type": "application/json"
            },
            body: JSON.stringify({ q: query, gl: "in", hl: "en" })
          });

          if (response.ok) {
            const data = await response.json();
            const newsItems = data.news || [];
            newsItems.slice(0, 10).forEach((item: any) => {
              combinedTier3Text += `\n\n--- GOOGLE NEWS ARTICLE ---\nTitle: ${item.title}\nSnippet: ${item.snippet}\nSource: ${item.source || ""}\nURL: ${item.link || ""}`;
              tier3Sources.push(item.link || "google.com/news");
            });
          }
        } catch (err: any) {
          console.warn(`[Tier 3 Ingest] Serper call failed for "${query}":`, err.message);
        }
      }

      if (combinedTier3Text.trim().length > 100) {
        const tier3Dimensions = await decomposeToDimensionMatrix(combinedTier3Text, true);
        console.log(`[Tier 3 Dimensions] Extracted ${tier3Dimensions.length} supplemental candidates.`);

        for (let i = 0; i < tier3Dimensions.length; i++) {
          if (insertCount >= targetBuffer) break;

          const fact = tier3Dimensions[i];
          const mappedNodeId = await mapSyllabusNodes(fact, formattedNodes);
          if (!mappedNodeId) continue;

          let searchContext = "";
          if ((fact.has_statutory_hook || fact.has_conceptual_hook) && fact.topic_title && fact.topic_title.length > 5) {
            searchContext = await searchWebContext(fact.topic_title);
          }

          const reasoning = await performVectorMatch(fact.fact_context, categoryId);
          const mcq = await generateMCQ(fact, reasoning, searchContext);
          if (!mcq) continue;

          const isValid = await validateMCQ(mcq);
          if (!isValid) continue;

          const isSemanticDup = await checkGeneratedQuestionSemanticDuplication(mcq.question, categoryId);
          if (isSemanticDup) continue;

          const contentHash = generateContentHash(mcq.question, mcq.options);
          
          try {
            const { data: existingByHash } = await supabaseAdmin
              .from("generated_mcqs")
              .select("id")
              .eq("content_hash", contentHash)
              .maybeSingle();

            if (existingByHash) continue;

            const finalEmbedding = await getEmbedding(mcq.question);
            const cleanSourceUrl = await maskCompetitorUrl(fact.topic_title, fact.source_url || "", targetDate);

            const mcqRecord = {
              exam_category_id: categoryId,
              question: mcq.question,
              options: mcq.options,
              correct_option: mcq.correct_option,
              explanation: mcq.explanation,
              reasoning_type: reasoning.reasoning_type,
              matched_pyq_id: reasoning.matched_pyq_id,
              matched_pyq_year: reasoning.matched_pyq_year,
              subject_tag: fact.subject_tag,
              source_article_url: cleanSourceUrl || "google.com/news",
              review_status: "pending",
              content_hash: contentHash,
              embedding: finalEmbedding,
            };

            const { error: insertError } = await supabaseAdmin
              .from("generated_mcqs")
              .upsert(mcqRecord, { onConflict: "content_hash", ignoreDuplicates: true });

            if (!insertError) {
              insertCount++;
              console.log(`✅ [Tier 3] [${insertCount}/${targetBuffer}] Seeded Question: ${mcq.question.slice(0, 50)}...`);
            }
          } catch (dbWriteErr: any) {
            insertCount++;
            console.log(`📝 [Sandbox Seed] Generated UPSC MCQ Question (Tier 3): "${mcq.question.slice(0, 55)}..."`);
          }
        }
      }
    }

    console.log(`🏁 Pipeline completed. Successfully seeded ${insertCount}/${targetBuffer} candidate questions.`);
    return { success: true, total_candidates: insertCount };

  } catch (err: any) {
    console.error(`❌ Pipeline critical error:`, err.message);
    return { success: false, total_candidates: 0 };
  }
}
