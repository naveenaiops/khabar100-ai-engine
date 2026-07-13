import { createClient } from "@supabase/supabase-js";
import path from "path";
import fs from "fs";

try {
  const envPath = path.resolve(process.cwd(), ".env.local");
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, "utf-8");
    envContent.split("\n").forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) return;
      const firstEqual = trimmed.indexOf("=");
      if (firstEqual === -1) return;
      const key = trimmed.slice(0, firstEqual).trim();
      const value = trimmed.slice(firstEqual + 1).trim();
      process.env[key] = value;
    });
  }
} catch (err: any) {}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://mock-project.supabase.co";
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

const supabaseAdmin = createClient(supabaseUrl, serviceKey);

async function viewSeededQuestions() {
  console.log("🔍 Querying Supabase for the newly seeded draft candidate questions...");
  const { data: mcqs, error } = await supabaseAdmin
    .from("generated_mcqs")
    .select("question, options, correct_option, explanation, subject_tag, source_article_url, created_at")
    .order("created_at", { ascending: false })
    .limit(10);

  if (error) {
    console.error("❌ Error fetching questions:", error.message);
    return;
  }

  if (!mcqs || mcqs.length === 0) {
    console.log("No questions found in 'generated_mcqs' table.");
    return;
  }

  console.log(`\n📚 Found ${mcqs.length} Seeded Questions:\n`);
  mcqs.forEach((mcq, idx) => {
    console.log(`--------------------------------------------------`);
    console.log(`❓ QUESTION ${idx + 1} [Subject: ${mcq.subject_tag}]`);
    console.log(`--------------------------------------------------`);
    console.log(mcq.question);
    console.log(`\nOptions:`);
    Object.entries(mcq.options).forEach(([key, val]) => {
      console.log(`  [${key}] ${val}`);
    });
    console.log(`\n✔️ Correct Option: ${mcq.correct_option}`);
    console.log(`📝 Explanation:\n${mcq.explanation}`);
    console.log(`🔗 Source URL: ${mcq.source_article_url || "N/A"}`);
    console.log(`📅 Created At: ${mcq.created_at}\n`);
  });
}

viewSeededQuestions();
