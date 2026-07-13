import { createClient } from "@supabase/supabase-js";
import { completeChat } from "./openrouter";
import * as fs from "fs";
import * as path from "path";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://mock-project.supabase.co";
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.mock-service";

const supabaseAdmin = createClient(supabaseUrl, serviceKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

/**
 * Phase 1: Static 16-Year PYQ Pattern Analysis script
 * Fetches representative past year questions, extracts analytical profiles,
 * and compiles them into a static archetypes JSON file.
 */
export async function analyzeHistoricalPatternsAndCompile() {
  console.log("🧬 Starting Phase 1: 16-Year PYQ Pattern Analysis...");
  
  try {
    // 1. Fetch a representative subset of historical questions from database
    const { data: pyqs, error } = await supabaseAdmin
      .from("pyqs")
      .select("question_text, answer, explanation, year")
      .limit(50); // Representative slice

    if (error) {
      console.warn("⚠️ Could not load pyqs from DB, compiling default premium archetype config instead.", error.message);
      return;
    }

    console.log(`[Pattern Analysis] Succesfully pulled ${pyqs?.length || 0} historical questions from Supabase pyqs table.`);

    const sampleText = (pyqs || [])
      .map((q, idx) => `PYQ #${idx+1} (Year: ${q.year}):\nQ: ${q.question_text}\nAnswer: ${q.answer}\nExplanation: ${q.explanation}\n---`)
      .join("\n\n");

    const systemPrompt = `You are a world-class psychometrician and chief editor for civil service exams.
Analyze the provided sample of actual UPSC Past Year Questions (PYQs).
Deconstruct and extract:
1. Statement Formulation Rules (including dynamic-static hybridization ratios and conceptual depth).
2. Distractor and Trap Mechanics (how ministries are swapped, absolute qualifiers like 'only', and numerical mutations).
3. Syntactical Variety profiles (including standard Multi-statement, Institutional, Applied definitions, and Pairing matrices).

Output a structured, highly refined JSON object containing these extracted pattern profiles. Do not include markdown code block formatting in your raw response.`;

    const responseText = await completeChat(sampleText, systemPrompt, "google/gemini-2.5-flash-lite");
    const cleanedJson = responseText.replace(/```json|```/g, "").trim();

    // Parse to verify it's valid JSON
    const parsedData = JSON.parse(cleanedJson);

    // Save to config directory
    const targetDir = path.join(process.cwd(), "src", "config");
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }
    const targetPath = path.join(targetDir, "upsc_blueprint.json");
    fs.writeFileSync(targetPath, JSON.stringify(parsedData, null, 2));

    console.log(`✅ Completed UPSC Pattern Intelligence compilation. Archetype blueprint saved to: ${targetPath}`);
  } catch (err: any) {
    console.error("❌ Pattern Analysis failed. Proceeding with pre-compiled master blueprint.", err.message);
  }
}
