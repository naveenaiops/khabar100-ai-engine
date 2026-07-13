import fs from "fs";
import path from "path";

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

async function runTestPipeline() {
  console.log("🚀 Initializing Live Trial Run of Upgraded UPSC Generation Pipeline...");
  
  const { runUPSCGenerationPipeline } = await import("./pipeline");

  // We run the pipeline for today's date
  const targetDate = new Date();
  
  console.log(`\n📅 Running pipeline for target date: ${targetDate.toDateString()}`);
  
  try {
    const result = await runUPSCGenerationPipeline(targetDate);
    console.log("\n==========================================");
    console.log("🏁 Trial Run Completed Successfully!");
    console.log(`Result:`, JSON.stringify(result, null, 2));
    console.log("==========================================");
  } catch (err: any) {
    console.error("❌ Pipeline crashed during test execution:", err.message);
  }
}

runTestPipeline();
