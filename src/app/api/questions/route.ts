import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    // 1. Authenticate user server-side
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    let isSubscribed = false;
    if (user) {
      const { data: profile } = await supabaseAdmin
        .from("users")
        .select("subscription_status, subscription_expiry")
        .eq("id", user.id)
        .maybeSingle();

      if (profile) {
        isSubscribed =
          profile.subscription_status === "active" &&
          (!profile.subscription_expiry || new Date(profile.subscription_expiry) > new Date());
      }
    }

    // 2. Fetch UPSC category ID
    const { data: category } = await supabaseAdmin
      .from("exam_categories")
      .select("id")
      .eq("slug", "upsc-prelims")
      .single();

    if (!category) {
      return NextResponse.json({ questions: [] });
    }

    // 3. Fetch live questions from generated_mcqs using service_role (bypassing RLS)
    const { data: dbQ, error } = await supabaseAdmin
      .from("generated_mcqs")
      .select("*")
      .eq("exam_category_id", category.id)
      .order("created_at", { ascending: false });

    if (error || !dbQ || dbQ.length === 0) {
      return NextResponse.json({ questions: [] });
    }

    // 4. Interleave/Diversify questions to ensure consecutive questions cover different topics.
    // Multi-angle decomposition generates 3-5 questions per news article at the exact same 'created_at' millisecond.
    // Grouping by 'created_at' and interleaving them guarantees different topics are mixed beautifully.
    const groups: { [key: string]: typeof dbQ } = {};
    for (const q of dbQ) {
      const ts = q.created_at ? new Date(q.created_at).getTime().toString() : "fallback";
      if (!groups[ts]) {
        groups[ts] = [];
      }
      groups[ts].push(q);
    }

    const interleaved: typeof dbQ = [];
    const groupKeys = Object.keys(groups);
    let maxLen = 0;
    for (const key of groupKeys) {
      maxLen = Math.max(maxLen, groups[key].length);
    }

    for (let i = 0; i < maxLen; i++) {
      for (const key of groupKeys) {
        if (groups[key][i]) {
          interleaved.push(groups[key][i]);
        }
      }
    }

    // 5. Map interleaved questions to frontend format
    const mapped = interleaved.map((q, idx) => ({
      id: q.id,
      question_number: idx + 1,
      subject_tag: q.subject_tag,
      question_text: q.question,
      options: q.options,
      correct_option: q.correct_option,
      explanation: q.explanation,
      reasoning_type: q.reasoning_type,
      reasoning_detail: q.matched_pyq_year 
        ? `Similar to UPSC Prelims ${q.matched_pyq_year} PYQ (Topic: ${q.subject_tag})` 
        : `Mapped to UPSC GS1 ${q.subject_tag} Syllabus Concept`,
      source_article_url: q.source_article_url || "",
      date: q.created_at ? new Date(q.created_at).toISOString().split("T")[0] : "2026-07-10",
    }));

    return NextResponse.json({ questions: mapped, isSubscribed });
  } catch (err: any) {
    console.error("❌ Questions API error:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
