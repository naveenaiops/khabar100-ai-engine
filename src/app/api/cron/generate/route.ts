import { NextResponse } from "next/server";
import { runUPSCGenerationPipeline } from "@/lib/ai/pipeline";

export async function GET(request: Request) {
  // 1. Verify Vercel Cron Secret to protect the endpoint from unauthorized triggers
  const authHeader = request.headers.get("Authorization");
  const expectedAuthHeader = `Bearer ${process.env.CRON_SECRET}`;

  // Only enforce CRON_SECRET check in production environment to allow easy local trigger/testing
  if (process.env.NODE_ENV === "production" && authHeader !== expectedAuthHeader) {
    return NextResponse.json(
      { error: "Unauthorized: Invalid or missing CRON_SECRET header" },
      { status: 401 }
    );
  }

  try {
    console.log("⏰ Daily Automated UPSC Current Affairs MCQ Generation Pipeline Triggered");

    // Strictly run the pipeline for the current calendar date (today)
    const result = await runUPSCGenerationPipeline(new Date());

    if (!result.success) {
      throw new Error("Pipeline run returned failed state.");
    }

    return NextResponse.json({
      success: true,
      message: "Daily UPSC MCQ pipeline executed successfully.",
      timestamp: new Date().toISOString(),
      candidates_generated: result.total_candidates,
      status: "pending_review"
    });
  } catch (error: any) {
    console.error("❌ Pipeline execution failed:", error);
    return NextResponse.json(
      { success: false, error: error.message || error },
      { status: 500 }
    );
  }
}
