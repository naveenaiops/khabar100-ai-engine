import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const dateParam = searchParams.get("date");
    const categoryParam = searchParams.get("category") || "upsc-prelims";

    // 1. Fetch category ID for UPSC/RPSC
    const { data: category } = await supabaseAdmin
      .from("exam_categories")
      .select("id")
      .eq("slug", categoryParam)
      .single();

    if (!category) {
      return NextResponse.json({ dates: [], questions: [] });
    }

    // Case A: Fetch unique list of dates in the database
    if (!dateParam) {
      const { data: dbDates, error } = await supabaseAdmin
        .from("generated_mcqs")
        .select("created_at")
        .eq("exam_category_id", category.id)
        .order("created_at", { ascending: false });

      if (error || !dbDates) {
        return NextResponse.json({ dates: [] });
      }

      // Extract unique dates as YYYY-MM-DD
      const uniqueDates = Array.from(
        new Set(
          dbDates
            .map((q) => {
              if (!q.created_at) return null;
              return new Date(q.created_at).toISOString().split("T")[0];
            })
            .filter(Boolean)
        )
      ) as string[];

      // Filter out today's date if requested, so only historical dates are shown
      const todayStr = new Date().toISOString().split("T")[0];
      const historicalDates = uniqueDates.filter((d) => d !== todayStr);

      // If no historical dates exist yet, fall back to July 9th & 10th as fallback anchors
      if (historicalDates.length === 0) {
        historicalDates.push("2026-07-10", "2026-07-09");
      }

      return NextResponse.json({ dates: historicalDates });
    }

    // Case B: Fetch questions for a specific archive date
    // Querying start-of-day and end-of-day
    const startDate = `${dateParam}T00:00:00.000Z`;
    const endDate = `${dateParam}T23:59:59.999Z`;

    const { data: dbQ, error } = await supabaseAdmin
      .from("generated_mcqs")
      .select("*")
      .eq("exam_category_id", category.id)
      .gte("created_at", startDate)
      .lte("created_at", endDate)
      .order("created_at", { ascending: true });

    // Fallback to mock data if there are no database entries for this specific date
    if (error || !dbQ || dbQ.length === 0) {
      return NextResponse.json({ questions: [] });
    }

    // Map questions to frontend format (stripping correct_option and explanation for server-side verification)
    const mapped = dbQ.map((q, idx) => ({
      id: q.id,
      question_number: idx + 1,
      subject_tag: q.subject_tag,
      question_text: q.question,
      options: q.options,
      reasoning_type: q.reasoning_type,
      reasoning_detail: `Mapped to UPSC GS1 ${q.subject_tag} Syllabus Concept`,
      source_article_url: q.source_article_url || "",
      date: dateParam,
    }));

    return NextResponse.json({ questions: mapped });
  } catch (err: any) {
    console.error("❌ Archive API error:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
