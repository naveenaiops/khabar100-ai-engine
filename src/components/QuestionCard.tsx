import React, { useState, useEffect, useRef } from "react";
import { Question } from "../lib/mockData";
import { Award, Repeat, GitCompare, BookOpen, ExternalLink, Calendar, Loader2 } from "lucide-react";

interface QuestionCardProps {
  question: Question;
  isBlurred?: boolean;
  showExplanationUpfront?: boolean;
}

export const QuestionCard: React.FC<QuestionCardProps> = ({ 
  question, 
  isBlurred = false,
  showExplanationUpfront = false
}) => {
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isChecking, setIsChecking] = useState<boolean>(false);
  const [checkedResult, setCheckedResult] = useState<{
    is_correct: boolean;
    correct_option: string;
    explanation: string;
    reasoning_tag: string;
    source_link: string;
  } | null>(null);

  const startTimeRef = useRef<number>(Date.now());

  // Reset card states if the question id changes
  useEffect(() => {
    setSelectedOption(null);
    setCheckedResult(null);
    setIsChecking(false);
    startTimeRef.current = Date.now();
  }, [question.id]);

  const handleOptionClick = async (option: string) => {
    if (selectedOption || isBlurred || showExplanationUpfront) return;

    setSelectedOption(option);
    setIsChecking(true);

    const timeTakenSeconds = Math.max(1, Math.round((Date.now() - startTimeRef.current) / 1000));

    try {
      const response = await fetch("/api/check-answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questionId: question.id,
          selectedOption: option,
          timeTakenSeconds,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setCheckedResult(data);
      } else {
        // Fallback comparison if API encounters an error
        console.warn("⚠️ API validation error, running local security fallback check");
        const isCorrect = option.toUpperCase() === (question.correct_option || "A").toUpperCase();
        setCheckedResult({
          is_correct: isCorrect,
          correct_option: question.correct_option || "A",
          explanation: question.explanation || "Detailed study material is mapped to your selected answer.",
          reasoning_tag: question.reasoning_detail || "Syllabus Paper Concept",
          source_link: question.source_article_url || "#",
        });
      }
    } catch (err) {
      console.error("❌ Failed checking answer:", err);
      const isCorrect = option.toUpperCase() === (question.correct_option || "A").toUpperCase();
      setCheckedResult({
        is_correct: isCorrect,
        correct_option: question.correct_option || "A",
        explanation: question.explanation || "Detailed study material is mapped to your selected answer.",
        reasoning_tag: question.reasoning_detail || "Syllabus Paper Concept",
        source_link: question.source_article_url || "#",
      });
    } finally {
      setIsChecking(false);
    }
  };

  const getReasoningBadge = (type: "repeated" | "similar" | "syllabus") => {
    switch (type) {
      case "repeated":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <Repeat className="w-3.5 h-3.5" />
            Repeated Concept
          </span>
        );
      case "similar":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            <GitCompare className="w-3.5 h-3.5" />
            Similar to PYQ
          </span>
        );
      case "syllabus":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <BookOpen className="w-3.5 h-3.5" />
            New from Syllabus
          </span>
        );
    }
  };

  const getSubjectColor = (subject: string) => {
    switch (subject.toLowerCase()) {
      case "polity":
        return "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20";
      case "economy":
        return "bg-amber-500/10 text-amber-400 border border-amber-500/20";
      case "environment":
        return "bg-teal-500/10 text-teal-400 border border-teal-500/20";
      case "history":
        return "bg-orange-500/10 text-orange-400 border border-orange-500/20";
      case "geography":
        return "bg-sky-500/10 text-sky-400 border border-sky-500/20";
      case "science & tech":
        return "bg-purple-500/10 text-purple-400 border border-purple-500/20";
      case "ir":
      case "current affairs":
        return "bg-pink-500/10 text-pink-400 border border-pink-500/20";
      default:
        return "bg-slate-500/10 text-slate-400 border border-slate-500/20";
    }
  };

  const renderQuestionText = (text: string) => {
    return text.split("\n").map((line, index) => (
      <p key={index} className="text-slate-300 leading-relaxed mb-2 last:mb-0">
        {line}
      </p>
    ));
  };

  return (
    <div
      className={`glass-card rounded-2xl p-6 md:p-8 mb-6 relative overflow-hidden transition-all duration-300 ${
        isBlurred ? "filter blur-[6px] select-none pointer-events-none opacity-50" : "hover:border-slate-800"
      }`}
    >
      {/* Visual Top Highlight Accent */}
      <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${
        question.reasoning_type === "repeated" ? "from-rose-500 to-red-600" :
        question.reasoning_type === "similar" ? "from-cyan-500 to-indigo-600" :
        "from-emerald-500 to-teal-600"
      }`} />

      {/* Header Info */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-5 pb-4 border-b border-slate-800/60">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center bg-slate-800/80 border border-slate-700 w-10 h-10 rounded-xl text-slate-200 font-bold text-sm">
            #{question.question_number}
          </div>
          <div className="flex flex-col">
            <span className="text-xs text-slate-500 font-medium uppercase tracking-wider flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              {question.date}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Topic tag */}
          <span className={`px-2.5 py-1 text-xs font-semibold rounded-md ${getSubjectColor(question.subject_tag)}`}>
            {question.subject_tag}
          </span>
          {/* Reasoning tag */}
          {getReasoningBadge(question.reasoning_type)}
        </div>
      </div>

      {/* Question Body */}
      <div className="mb-6 font-display font-medium text-lg md:text-xl">
        {renderQuestionText(question.question_text)}
      </div>

      {/* Options Stack */}
      <div className="space-y-3 mb-6">
        {Object.entries(question.options).map(([key, value]) => {
          // If passive (explanation upfront) is true, highlight correct answer immediately
          if (showExplanationUpfront) {
            const isCorrect = key === question.correct_option;
            return (
              <div
                key={key}
                className={`flex items-start gap-4 p-4 rounded-xl border transition-all duration-200 ${
                  isCorrect
                    ? "bg-emerald-500/10 border-emerald-500/30 text-slate-100 shadow-md shadow-emerald-500/5"
                    : "bg-slate-900/40 border-slate-800/80 text-slate-400"
                }`}
              >
                <span
                  className={`flex items-center justify-center w-6 h-6 rounded-md text-xs font-bold shrink-0 mt-0.5 ${
                    isCorrect
                      ? "bg-emerald-500 text-slate-950"
                      : "bg-slate-800 border border-slate-700 text-slate-400"
                  }`}
                >
                  {key}
                </span>
                <p className="text-sm leading-relaxed">{value}</p>
              </div>
            );
          }

          // Interactive Practice Mode style state calculation
          const isClicked = selectedOption === key;
          const hasChecked = checkedResult !== null;
          const isCorrectAnswer = hasChecked && checkedResult.correct_option === key;
          const isIncorrectClicked = isClicked && hasChecked && !checkedResult.is_correct;

          let cardStyle = "bg-slate-900/40 border-slate-800/80 text-slate-400 hover:bg-slate-900 hover:border-slate-700/80 cursor-pointer";
          let circleStyle = "bg-slate-800 border border-slate-700 text-slate-400";

          if (isChecking && isClicked) {
            cardStyle = "bg-slate-900/60 border-primary-500/40 text-slate-300 animate-pulse cursor-not-allowed";
            circleStyle = "bg-primary-500 text-slate-950";
          } else if (hasChecked) {
            if (isCorrectAnswer) {
              cardStyle = "bg-emerald-500/10 border-emerald-500/30 text-slate-100 shadow-md shadow-emerald-500/5 cursor-not-allowed";
              circleStyle = "bg-emerald-500 text-slate-950";
            } else if (isIncorrectClicked) {
              cardStyle = "bg-rose-500/10 border-rose-500/30 text-slate-100 shadow-md shadow-rose-500/5 cursor-not-allowed";
              circleStyle = "bg-rose-500 text-slate-950";
            } else {
              cardStyle = "bg-slate-950/20 border-slate-900/60 text-slate-600 cursor-not-allowed";
              circleStyle = "bg-slate-900 border border-slate-800 text-slate-600";
            }
          }

          return (
            <button
              key={key}
              disabled={isChecking || hasChecked || isBlurred}
              onClick={() => handleOptionClick(key)}
              className={`w-full text-left flex items-start gap-4 p-4 rounded-xl border transition-all duration-200 ${cardStyle}`}
            >
              <span className={`flex items-center justify-center w-6 h-6 rounded-md text-xs font-bold shrink-0 mt-0.5 ${circleStyle}`}>
                {isChecking && isClicked ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  key
                )}
              </span>
              <p className="text-sm leading-relaxed">{value}</p>
            </button>
          );
        })}
      </div>

      {/* Explanation Section */}
      {(showExplanationUpfront || checkedResult) && (
        <div className="animate-fade-in space-y-5 border-t border-slate-900/60 pt-5">
          <div className="bg-slate-900/50 rounded-xl p-5 border border-slate-800/80">
            <h4 className="text-xs font-bold uppercase text-slate-400 tracking-wider mb-2 flex items-center gap-1.5">
              <Award className="w-4 h-4 text-emerald-500" />
              Syllabus-Mapped Explanation
            </h4>
            <p className="text-sm text-slate-300 leading-relaxed font-sans">
              {showExplanationUpfront ? question.explanation : checkedResult?.explanation}
            </p>
          </div>

          {/* Reasoning detail & Source section */}
          <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
            <p className="text-xs text-slate-400 font-medium italic">
              💡 {showExplanationUpfront ? question.reasoning_detail : checkedResult?.reasoning_tag}
            </p>

            <a
              href={showExplanationUpfront ? question.source_article_url : checkedResult?.source_link}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-primary-400 hover:text-primary-300 font-semibold transition-colors group"
            >
              Read the original article
              <ExternalLink className="w-3.5 h-3.5 transform group-hover:translate-x-0.5 transition-transform" />
            </a>
          </div>
        </div>
      )}
    </div>
  );
};
