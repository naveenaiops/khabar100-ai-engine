import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { MOCK_UPSC_QUESTIONS, MOCK_RPSC_QUESTIONS, Question } from "@/lib/mockData";

// Robust mock helper to find questions when running in demo/mock mode
function findMockQuestion(id: string): Question | undefined {
  const normId = id.toLowerCase();
  
  // Direct match
  let match = MOCK_UPSC_QUESTIONS.find(q => q.id === normId);
  if (match) return match;
  
  match = MOCK_RPSC_QUESTIONS.find(q => q.id === normId);
  if (match) return match;

  // Pattern match for category-generated dynamic feeds (e.g. upsc-prelims-25, rpsc-12)
  if (normId.startsWith("upsc")) {
    const num = parseInt(normId.split("-").pop() || "");
    if (!isNaN(num)) {
      const idx = (num - 1) % MOCK_UPSC_QUESTIONS.length;
      return MOCK_UPSC_QUESTIONS[idx];
    }
  } else if (normId.startsWith("rpsc")) {
    const num = parseInt(normId.split("-").pop() || "");
    if (!isNaN(num)) {
      const idx = (num - 1) % MOCK_RPSC_QUESTIONS.length;
      return MOCK_RPSC_QUESTIONS[idx];
    }
  }
  
  return undefined;
}

export async function POST(request: Request) {
  try {
    const { questionId, selectedOption, timeTakenSeconds = 0 } = await request.json();

    if (!questionId || !selectedOption) {
      return NextResponse.json(
        { error: "Missing required fields: questionId and selectedOption" },
        { status: 400 }
      );
    }

    let correctOption = "";
    let explanation = "";
    let reasoningTag = "";
    let sourceLink = "";
    let isCorrect = false;

    // 1. Try fetching from the database first if it looks like a database UUID
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(questionId);
    
    if (isUuid) {
      const { data: dbQuestion, error } = await supabaseAdmin
        .from("daily_questions")
        .select("correct_option, explanation, reasoning_type, reasoning_detail, source_article_url")
        .eq("id", questionId)
        .maybeSingle();

      let matchedQuestion = dbQuestion;

      if (!matchedQuestion) {
        const { data: genQuestion } = await supabaseAdmin
          .from("generated_mcqs")
          .select("correct_option, explanation, reasoning_type, subject_tag, source_article_url, matched_pyq_year")
          .eq("id", questionId)
          .maybeSingle();

        if (genQuestion) {
          matchedQuestion = {
            correct_option: genQuestion.correct_option,
            explanation: genQuestion.explanation,
            reasoning_type: genQuestion.reasoning_type,
            reasoning_detail: genQuestion.matched_pyq_year 
              ? `Similar to UPSC Prelims ${genQuestion.matched_pyq_year} PYQ (Topic: ${genQuestion.subject_tag})` 
              : `Mapped to ${genQuestion.subject_tag} Syllabus Concept`,
            source_article_url: genQuestion.source_article_url,
          };
        }
      }

      if (matchedQuestion) {
        correctOption = matchedQuestion.correct_option;
        explanation = matchedQuestion.explanation;
        reasoningTag = matchedQuestion.reasoning_detail || matchedQuestion.reasoning_type;
        sourceLink = matchedQuestion.source_article_url || "";
        isCorrect = selectedOption.toUpperCase() === correctOption.toUpperCase();
      }
    }

    // 2. Fall back to local mock data matching if DB lookup is skipped or returns empty
    if (!correctOption) {
      const mockQuestion = findMockQuestion(questionId);
      if (mockQuestion) {
        correctOption = mockQuestion.correct_option;
        explanation = mockQuestion.explanation;
        reasoningTag = mockQuestion.reasoning_detail || mockQuestion.reasoning_type;
        sourceLink = mockQuestion.source_article_url;
        isCorrect = selectedOption.toUpperCase() === correctOption.toUpperCase();
      } else {
        return NextResponse.json(
          { error: `Question not found for ID: ${questionId}` },
          { status: 404 }
        );
      }
    }

    // 3. Authenticate current user using Supabase Server-Side Auth helper
    let userId: string | null = null;
    try {
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        userId = user.id;
      }
    } catch (e) {
      console.log("No active server-side auth session found, logging attempt as guest.");
    }

    // 4. Log the user attempt in the attempts table
    try {
      await supabaseAdmin.from("attempts").insert({
        user_id: userId,
        question_id: questionId,
        selected_option: selectedOption,
        is_correct: isCorrect,
        time_taken_seconds: timeTakenSeconds,
      });
    } catch (attemptError) {
      console.error("⚠️ Failed to log attempt in DB:", attemptError);
      // Fallback: We proceed with returning the result so practicing never breaks even if DB logs hit network hiccups.
    }

    return NextResponse.json({
      is_correct: isCorrect,
      correct_option: correctOption,
      explanation: explanation,
      reasoning_tag: reasoningTag,
      source_link: sourceLink
    });

  } catch (error: any) {
    console.error("❌ check-answer handler failed:", error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
