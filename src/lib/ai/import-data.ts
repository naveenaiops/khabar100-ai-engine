import fs from "fs";
import path from "path";
import { createClient } from "@supabase/supabase-js";
import { getEmbedding } from "./openrouter";

// 1. Manually parse .env.production if standard process.env keys are missing (essential for standalone execution)
function loadEnv() {
  const envPath = path.join(process.cwd(), ".env.production");
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, "utf8");
    content.split(/\r?\n/).forEach((line) => {
      const match = line.match(/^\s*([^#=\s]+)\s*=\s*(.*)\s*$/);
      if (match) {
        const key = match[1];
        let val = match[2].trim();
        // Strip optional wrapping quotes
        if (
          (val.startsWith('"') && val.endsWith('"')) ||
          (val.startsWith("'") && val.endsWith("'"))
        ) {
          val = val.substring(1, val.length - 1);
        }
        if (!process.env[key]) {
          process.env[key] = val;
        }
      }
    });
  }
}

loadEnv();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error("❌ Critical: Missing Supabase URL or Service Role Key in environment.");
  process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, serviceKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

async function main() {
  console.log("🚀 Starting Khabar100 Unified Data Importer...");

  const syllabusPath = path.join(process.cwd(), "data", "syllabus.json");
  const pyqsPath = path.join(process.cwd(), "data", "pyqs.json");

  if (!fs.existsSync(syllabusPath) || !fs.existsSync(pyqsPath)) {
    console.error("❌ Critical: One or both source files (syllabus.json, pyqs.json) are missing in the data/ folder.");
    process.exit(1);
  }

  // Load category cache
  console.log("📂 Fetching exam categories...");
  const { data: categories, error: catError } = await supabaseAdmin
    .from("exam_categories")
    .select("id, slug, name");

  if (catError) {
    console.error("❌ Failed to fetch exam categories:", catError.message);
    process.exit(1);
  }

  const categoryMap = new Map<string, string>(); // slug -> id
  categories.forEach((cat) => {
    categoryMap.set(cat.slug, cat.id);
  });

  console.log(`✅ Loaded ${categories.length} categories.`);

  // Stage 1: Load and Insert Syllabus Nodes
  console.log("\n📑 Stage 1: Importing Syllabus Nodes...");
  const syllabusData = JSON.parse(fs.readFileSync(syllabusPath, "utf8"));
  const syllabusLookup = new Map<string, string>(); // "categorySlug::subject::topic" -> nodeUuid

  let syllabusSuccessCount = 0;

  for (let i = 0; i < syllabusData.length; i++) {
    const item = syllabusData[i];
    const { category, subject, topic } = item;

    const categoryId = categoryMap.get(category);
    if (!categoryId) {
      console.warn(`⚠️ Warning: Category slug '${category}' in syllabus not found in database. Skipping.`);
      continue;
    }

    const cacheKey = `${category}::${subject}::${topic}`;

    // Deduplicate / Find if node already exists in database
    const { data: existingNode, error: checkError } = await supabaseAdmin
      .from("syllabus_nodes")
      .select("id")
      .eq("exam_category_id", categoryId)
      .eq("subject", subject)
      .eq("topic", topic)
      .maybeSingle();

    if (checkError) {
      console.error(`❌ Error checking syllabus node matching ${cacheKey}:`, checkError.message);
      continue;
    }

    let nodeId = "";
    if (existingNode) {
      nodeId = existingNode.id;
    } else {
      // Insert new node
      const { data: insertedNode, error: insertError } = await supabaseAdmin
        .from("syllabus_nodes")
        .insert({
          exam_category_id: categoryId,
          subject,
          topic,
        })
        .select("id")
        .single();

      if (insertError) {
        console.error(`❌ Failed to insert syllabus node [${cacheKey}]:`, insertError.message);
        continue;
      }
      nodeId = insertedNode.id;
      syllabusSuccessCount++;
    }

    syllabusLookup.set(cacheKey, nodeId);
  }

  console.log(`✅ Syllabus node import complete. (Total Cached: ${syllabusLookup.size}, Newly Created: ${syllabusSuccessCount})`);

  // Stage 2: Load, Map, Embed, and Insert PYQs
  console.log("\n🧠 Stage 2: Importing Past Year Questions (PYQs) with inline Vector Embeddings...");
  const pyqsData = JSON.parse(fs.readFileSync(pyqsPath, "utf8"));

  let pyqSuccessCount = 0;
  let pyqSkipCount = 0;

  for (let i = 0; i < pyqsData.length; i++) {
    const item = pyqsData[i];
    const {
      id: pyqId,
      year,
      question_number,
      question: rawQuestionText,
      option_a,
      option_b,
      option_c,
      option_d,
      correct_answer,
      subject,
      topic,
      category,
      source,
    } = item;

    const categorySlug = category || "upsc-prelims";
    const categoryId = categoryMap.get(categorySlug);
    if (!categoryId) {
      console.warn(`[Row ${i + 1}] ⚠️ Skipping: Category slug '${categorySlug}' not found.`);
      continue;
    }

    // Normalizing the question text (sometimes contains noise or weird characters)
    const questionText = rawQuestionText ? rawQuestionText.trim() : "";
    if (!questionText) {
      console.warn(`[Row ${i + 1}] ⚠️ Skipping: Question text is empty.`);
      continue;
    }

    const finalPyqId = pyqId ? pyqId.trim() : "";
    if (!finalPyqId) {
      console.warn(`[Row ${i + 1}] ⚠️ Skipping: ID string is missing.`);
      continue;
    }

    // Check if the PYQ is already in the system using the primary key TEXT id
    const { data: existingPyq, error: checkPyqError } = await supabaseAdmin
      .from("pyqs")
      .select("id, subject, topic")
      .eq("id", finalPyqId)
      .maybeSingle();

    if (checkPyqError) {
      console.error(`[Row ${i + 1}] ❌ Error checking existing PYQ (${finalPyqId}):`, checkPyqError.message);
      continue;
    }

    // If it exists and already has subject populated, skip it!
    // Otherwise, we can update it or insert if missing
    if (existingPyq && existingPyq.subject && existingPyq.topic) {
      pyqSkipCount++;
      continue;
    }

    // Match syllabus node UUID
    // Attempt standard match, if not found, let's do case-insensitive/fuzzy lookup or fallback
    let syllabusNodeId: string | null = null;
    const lookupKey = `${categorySlug}::${subject}::${topic}`;
    syllabusNodeId = syllabusLookup.get(lookupKey) || null;

    if (!syllabusNodeId && subject && topic) {
      // Fallback fuzzy search if raw key didn't match perfectly
      const { data: fuzzyNode } = await supabaseAdmin
        .from("syllabus_nodes")
        .select("id")
        .eq("exam_category_id", categoryId)
        .ilike("subject", `%${subject}%`)
        .ilike("topic", `%${topic}%`)
        .limit(1)
        .maybeSingle();

      if (fuzzyNode && fuzzyNode.id) {
        syllabusNodeId = fuzzyNode.id;
        syllabusLookup.set(lookupKey, fuzzyNode.id); // Cache the fuzzy match
      }
    }

    console.log(`[${i + 1}/${pyqsData.length}] 🧬 Generating vector embedding for Year ${year} Q#${question_number || i + 1} (ID: ${finalPyqId})...`);
    
    let embedding: number[] | null = null;
    try {
      // Compute the 768-dimensional native embedding vector
      embedding = await getEmbedding(questionText);
    } catch (embErr: any) {
      console.error(`[Row ${i + 1}] ❌ Failed to fetch vector embedding. Skipping:`, embErr.message);
      continue;
    }

    // Grouping option fields into options column JSONB
    const optionsJson = {
      A: option_a ? option_a.trim() : "",
      B: option_b ? option_b.trim() : "",
      C: option_c ? option_c.trim() : "",
      D: option_d ? option_d.trim() : "",
    };

    // Mapping correct_answer to correct_option
    const finalCorrectOption = correct_answer ? correct_answer.trim().toUpperCase() : "A";

    const pyqRow = {
      id: finalPyqId,
      exam_category_id: categoryId,
      year: parseInt(year) || new Date().getFullYear(),
      question_text: questionText,
      options: optionsJson,
      correct_option: finalCorrectOption,
      syllabus_node_id: syllabusNodeId,
      subject: subject ? subject.trim() : null, // Store subject directly in pyqs table!
      topic: topic ? topic.trim() : null,     // Store topic directly in pyqs table!
      embedding: embedding,
      source: source || `UPSC GS1 Paper ${year}`,
    };

    // If row exists but is missing subject/topic columns, we update it
    if (existingPyq) {
      const { error: updatePyqError } = await supabaseAdmin
        .from("pyqs")
        .update({
          subject: pyqRow.subject,
          topic: pyqRow.topic,
          syllabus_node_id: pyqRow.syllabus_node_id,
        })
        .eq("id", finalPyqId);

      if (updatePyqError) {
        console.error(`[Row ${i + 1}] ❌ Database update failed for ${finalPyqId}:`, updatePyqError.message);
        continue;
      }
    } else {
      // Insert new row
      const { error: insertPyqError } = await supabaseAdmin
        .from("pyqs")
        .insert(pyqRow);

      if (insertPyqError) {
        console.error(`[Row ${i + 1}] ❌ Database insert failed for ${finalPyqId}:`, insertPyqError.message);
        continue;
      }
    }

    pyqSuccessCount++;
    
    // Add small rate-limit breathing room (50ms) to ensure smooth API execution
    await new Promise((resolve) => setTimeout(resolve, 50));
  }

  console.log("\n🏁 Import Execution Summary:");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(`✨ Seeding/Updating Syllabus Nodes : ${syllabusSuccessCount}`);
  console.log(`✨ Seeding/Updating PYQs          : ${pyqSuccessCount}`);
  console.log(`⏩ Already Complete (Skipped)      : ${pyqSkipCount}`);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("🎉 All operations completed successfully!");
}

main().catch((err) => {
  console.error("❌ Critical exception during import execution:", err);
});
