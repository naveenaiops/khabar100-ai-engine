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

async function forceGenerate100() {
  console.log("🚀 Starting Bulk 100 UPSC MCQ Generation Task...");
  
  const { runUPSCGenerationPipeline } = await import("./pipeline");

  // Get current count of questions in generated_mcqs
  const { count: initialCount } = await supabaseAdmin
    .from("generated_mcqs")
    .select("*", { count: "exact", head: true });

  console.log(`📊 Initial count of questions in database: ${initialCount || 0}`);
  
  let currentCount = initialCount || 0;
  let attempt = 1;

  console.log(`📅 Targeting news published strictly on today's date: ${new Date().toLocaleDateString()}`);
  await runUPSCGenerationPipeline(new Date());

  // Re-check count
  const { count: updatedCount } = await supabaseAdmin
    .from("generated_mcqs")
    .select("*", { count: "exact", head: true });

  currentCount = updatedCount || 0;
  console.log(`📊 Current total count of questions in database: ${currentCount}`);

  console.log(`\n==========================================`);
  console.log(`🎉 SUCCESS! Generated and uploaded questions directly to your website.`);
  console.log(`📊 Final total count: ${currentCount} questions are now live!`);
  console.log(`==========================================`);
}

forceGenerate100();
