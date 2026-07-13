"use client";

import React, { useState } from "react";
import { Navbar } from "@/components/Navbar";
import { ShieldCheck, AlertTriangle, CheckCircle, Trash2, Edit3, Save, Sparkles, Filter, CheckCheck } from "lucide-react";

interface CandidateQuestion {
  id: string;
  category: "upsc-prelims" | "rpsc";
  subject_tag: string;
  question_text: string;
  options: {
    A: string;
    B: string;
    C: string;
    D: string;
  };
  correct_option: "A" | "B" | "C" | "D";
  explanation: string;
  reasoning_type: "repeated" | "similar" | "syllabus";
  reasoning_detail: string;
  source_article_url: string;
  quality_flags: string[];
}

const INITIAL_CANDIDATES: CandidateQuestion[] = [
  {
    id: "cand-1",
    category: "upsc-prelims",
    subject_tag: "Economy",
    question_text: "Consider the following statements regarding the Unified Payments Interface (UPI):\n1. It allows multiple bank accounts to be loaded into a single mobile application.\n2. It supports merchant payments as well as peer-to-peer fund transfers.\n3. It was developed by the National Payments Corporation of India (NPCI).\nWhich of the statements given above are correct?",
    options: {
      A: "1 and 2 only",
      B: "2 and 3 only",
      C: "1 and 3 only",
      D: "1, 2 and 3"
    },
    correct_option: "D",
    explanation: "All statements are correct. UPI is a real-time instant payment system developed by NPCI. It merges multiple banking services, seamless fund routing & merchant payments under one hood.",
    reasoning_type: "repeated",
    reasoning_detail: "Concept matches a 2017 UPSC Prelims question on NPCI-led digital platforms.",
    source_article_url: "https://www.thehindu.com/business/Economy/upi-transactions-hit-record-high/article671231.ece",
    quality_flags: [] // Clean - no flags!
  },
  {
    id: "cand-2",
    category: "upsc-prelims",
    subject_tag: "Environment",
    question_text: "With reference to the Wildlife Protection Act, 1972, which of the following animals are classified under Schedule I, receiving the highest level of legal protection?\n1. Tiger\n2. Cheetah\n3. Common Crow\nSelect the correct answer:",
    options: {
      A: "1 and 2 only",
      B: "2 and 3 only",
      C: "1 and 3 only",
      D: "1, 2 and 3"
    },
    correct_option: "A",
    explanation: "Tiger and Cheetah are listed in Schedule I (highest protection). Common Crow was historically vermin and is not included under Schedule I.",
    reasoning_type: "similar",
    reasoning_detail: "Similar to a 2020 UPSC Prelims question regarding Schedule animals.",
    source_article_url: "https://www.thehindu.com/news/national/cheetah-reintroduction-project-status/article672314.ece",
    quality_flags: ["⚠️ Low explanation word count (under 30 words)"] // Flagged by AI gate!
  },
  {
    id: "cand-3",
    category: "rpsc",
    subject_tag: "History",
    question_text: "The famous 'Phad' painting style of Rajasthan is traditionally practiced by the members of which family in Bhilwara district?",
    options: {
      A: "Joshi family",
      B: "Shekhawat family",
      C: "Rathore family",
      D: "Bhati family"
    },
    correct_option: "A",
    explanation: "The Joshi family of Shahpura in Bhilwara district has been the traditional practitioner of Phad painting for centuries. It involves narrative scroll paintings depicting folk deities like Pabuji or Devnarayan.",
    reasoning_type: "syllabus",
    reasoning_detail: "Directly maps to RPSC Unit 1 - Art & Culture of Rajasthan.",
    source_article_url: "https://www.thehindu.com/features/arts/the-narrative-art-of-phad-scrolls/article601934.ece",
    quality_flags: [] // Clean
  },
  {
    id: "cand-4",
    category: "rpsc",
    subject_tag: "Geography",
    question_text: "Which of the following passes (La) is NOT situated in the Aravalli hills region of Rajasthan?",
    options: {
      A: "Haldighati",
      B: "Someshwar Nal",
      C: "Pipali Ghat",
      D: "Shipki La"
    },
    correct_option: "D",
    explanation: "Shipki La is a mountain pass on the India-China border in Himachal Pradesh, not Rajasthan.",
    reasoning_type: "similar",
    reasoning_detail: "Similar to past questions regarding pass topography.",
    source_article_url: "https://www.thehindu.com/news/national/other-states/geological-history-of-aravallis/article671109.ece",
    quality_flags: ["⚠️ Option spelling discrepancy: check Haldighati", "⚠️ Possible high similarity with pyqs-4813"] // Flagged!
  }
];

export default function AdminReviewPage() {
  const [category, setCategory] = useState<"upsc-prelims" | "rpsc">("upsc-prelims");
  const [candidates, setCandidates] = useState<CandidateQuestion[]>(INITIAL_CANDIDATES);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<CandidateQuestion | null>(null);
  const [filterMode, setFilterMode] = useState<"all" | "flagged" | "clean">("all");
  
  // Progress logging
  const [approvedCount, setApprovedCount] = useState<number>(0);
  const [rejectedCount, setRejectedCount] = useState<number>(0);

  const activeCandidates = candidates.filter(
    (c) =>
      c.category === category &&
      (filterMode === "all" ||
        (filterMode === "flagged" && c.quality_flags.length > 0) ||
        (filterMode === "clean" && c.quality_flags.length === 0))
  );

  const startEditing = (cand: CandidateQuestion) => {
    setEditingId(cand.id);
    setEditForm({ ...cand });
  };

  const handleEditChange = (field: keyof CandidateQuestion, value: any) => {
    if (editForm) {
      setEditForm({
        ...editForm,
        [field]: value,
      });
    }
  };

  const handleOptionChange = (key: "A" | "B" | "C" | "D", value: string) => {
    if (editForm) {
      setEditForm({
        ...editForm,
        options: {
          ...editForm.options,
          [key]: value,
        },
      });
    }
  };

  const saveEdit = () => {
    if (editForm) {
      setCandidates(candidates.map((c) => (c.id === editForm.id ? editForm : c)));
      setEditingId(null);
      setEditForm(null);
    }
  };

  const approveCandidate = (id: string) => {
    setCandidates(candidates.filter((c) => c.id !== id));
    setApprovedCount((prev) => prev + 1);
  };

  const rejectCandidate = (id: string) => {
    setCandidates(candidates.filter((c) => c.id !== id));
    setRejectedCount((prev) => prev + 1);
  };

  const bulkApproveUnflagged = () => {
    const unflagged = candidates.filter((c) => c.category === category && c.quality_flags.length === 0);
    setCandidates(candidates.filter((c) => !(c.category === category && c.quality_flags.length === 0)));
    setApprovedCount((prev) => prev + unflagged.length);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans pb-24">
      {/* Navbar wrapper */}
      <Navbar
        currentCategory={category}
        onCategoryChange={setCategory}
        isSubscribed={true}
      />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 flex-1 w-full space-y-6 relative z-10">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/40 p-6 rounded-2xl border border-slate-800/80">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black bg-rose-500/10 text-rose-400 border border-rose-500/20 px-2 py-0.5 rounded uppercase tracking-wider flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" />
                Administrator Mode
              </span>
            </div>
            <h1 className="font-display font-black text-2xl text-slate-100 mt-2">
              Quality Review Queue
            </h1>
            <p className="text-slate-400 text-xs mt-1">
              Verify AI candidates. Ensure 100% factual accuracy before hitting publish for {category === "rpsc" ? "RPSC" : "UPSC"}.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Quick stats */}
            <div className="bg-slate-950/80 px-4 py-2 rounded-xl border border-slate-850 flex gap-4 text-xs">
              <div>
                <span className="text-slate-500">Approved:</span>{" "}
                <span className="font-bold text-emerald-400 font-mono">{approvedCount}/100</span>
              </div>
              <div className="w-px bg-slate-800" />
              <div>
                <span className="text-slate-500">Rejected:</span>{" "}
                <span className="font-bold text-rose-400 font-mono">{rejectedCount}</span>
              </div>
            </div>

            <button
              onClick={bulkApproveUnflagged}
              className="h-10 px-4 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shadow"
            >
              <CheckCheck className="w-4 h-4" />
              Bulk Approve Clean
            </button>
          </div>
        </div>

        {/* Filters bar */}
        <div className="flex items-center justify-between gap-4 border-b border-slate-900 pb-3 text-xs">
          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-slate-500" />
            <span className="text-slate-500 font-medium">Filter Queue:</span>
            <div className="flex bg-slate-900 rounded-lg p-0.5 border border-slate-800/80 ml-2">
              <button
                onClick={() => setFilterMode("all")}
                className={`px-3 py-1 rounded-md font-semibold ${
                  filterMode === "all" ? "bg-slate-800 text-primary-400" : "text-slate-400"
                }`}
              >
                All Drafts
              </button>
              <button
                onClick={() => setFilterMode("flagged")}
                className={`px-3 py-1 rounded-md font-semibold ${
                  filterMode === "flagged" ? "bg-slate-800 text-amber-400" : "text-slate-400"
                }`}
              >
                Gated Flags
              </button>
              <button
                onClick={() => setFilterMode("clean")}
                className={`px-3 py-1 rounded-md font-semibold ${
                  filterMode === "clean" ? "bg-slate-800 text-emerald-400" : "text-slate-400"
                }`}
              >
                Clean
              </button>
            </div>
          </div>

          <p className="text-slate-500 font-mono">
            {activeCandidates.length} Drafts Remaining in Queue
          </p>
        </div>

        {/* Candidate Feed */}
        <div className="space-y-6">
          {activeCandidates.length === 0 ? (
            <div className="p-16 border border-slate-900 bg-slate-950 rounded-2xl text-center space-y-3">
              <p className="text-slate-400 text-sm font-semibold">
                No draft candidate questions match this filter.
              </p>
              <p className="text-xs text-slate-500">
                Bulk approve clean candidates or select another filter.
              </p>
            </div>
          ) : (
            activeCandidates.map((cand) => {
              const isEditing = editingId === cand.id;

              return (
                <div
                  key={cand.id}
                  className={`glass-card rounded-2xl border p-6 md:p-8 relative ${
                    cand.quality_flags.length > 0
                      ? "border-amber-500/20 bg-slate-950/20"
                      : "border-slate-850"
                  }`}
                >
                  {/* Flag warnings at the very top */}
                  {cand.quality_flags.map((flag, idx) => (
                    <div
                      key={idx}
                      className="mb-4 p-3 bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs rounded-xl flex items-center gap-2"
                    >
                      <AlertTriangle className="w-4 h-4 shrink-0" />
                      <span>{flag}</span>
                    </div>
                  ))}

                  {isEditing ? (
                    /* EDITING MODE INPUTS */
                    <div className="space-y-4 text-xs font-sans text-slate-300">
                      <div>
                        <label className="block text-[10px] text-slate-500 uppercase font-bold mb-1">
                          Question STEM
                        </label>
                        <textarea
                          value={editForm?.question_text || ""}
                          onChange={(e) => handleEditChange("question_text", e.target.value)}
                          rows={4}
                          className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-sm focus:border-primary-500 focus:outline-none"
                        />
                      </div>

                      {/* Options input grid */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {["A", "B", "C", "D"].map((opt) => (
                          <div key={opt}>
                            <label className="block text-[10px] text-slate-500 uppercase font-bold mb-1">
                              Option {opt}
                            </label>
                            <input
                              type="text"
                              value={editForm?.options[opt as "A" | "B" | "C" | "D"] || ""}
                              onChange={(e) =>
                                handleOptionChange(opt as "A" | "B" | "C" | "D", e.target.value)
                              }
                              className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm focus:border-primary-500 focus:outline-none"
                            />
                          </div>
                        ))}
                      </div>

                      {/* Correct choice selector */}
                      <div className="flex gap-4">
                        <div>
                          <label className="block text-[10px] text-slate-500 uppercase font-bold mb-1">
                            Correct Answer
                          </label>
                          <select
                            value={editForm?.correct_option || "A"}
                            onChange={(e) =>
                              handleEditChange("correct_option", e.target.value as any)
                            }
                            className="bg-slate-900 border border-slate-800 rounded-lg px-3 h-10 focus:border-primary-500 focus:outline-none"
                          >
                            <option value="A">A</option>
                            <option value="B">B</option>
                            <option value="C">C</option>
                            <option value="D">D</option>
                          </select>
                        </div>

                        <div className="flex-1">
                          <label className="block text-[10px] text-slate-500 uppercase font-bold mb-1">
                            Reasoning Detail Text
                          </label>
                          <input
                            type="text"
                            value={editForm?.reasoning_detail || ""}
                            onChange={(e) => handleEditChange("reasoning_detail", e.target.value)}
                            className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 h-10 focus:border-primary-500 focus:outline-none"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[10px] text-slate-500 uppercase font-bold mb-1">
                          Explanation Text
                        </label>
                        <textarea
                          value={editForm?.explanation || ""}
                          onChange={(e) => handleEditChange("explanation", e.target.value)}
                          rows={3}
                          className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 focus:border-primary-500 focus:outline-none"
                        />
                      </div>

                      <div className="flex justify-end gap-2 pt-2">
                        <button
                          onClick={() => setEditingId(null)}
                          className="h-9 px-4 bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200 text-xs font-bold rounded-lg cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={saveEdit}
                          className="h-9 px-4 bg-primary-600 hover:bg-primary-500 text-slate-950 font-bold text-xs rounded-lg cursor-pointer flex items-center gap-1"
                        >
                          <Save className="w-3.5 h-3.5" />
                          Save Changes
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* RENDER CANDIDATE CONTENT */
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <span className="text-xs text-slate-500">
                          ID: <span className="font-mono font-bold text-slate-400">{cand.id}</span>
                        </span>

                        <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded bg-slate-900 border border-slate-800 text-slate-400">
                          {cand.subject_tag}
                        </span>
                      </div>

                      <p className="text-slate-200 leading-relaxed font-semibold font-display mb-4">
                        {cand.question_text}
                      </p>

                      {/* Render choice stack */}
                      <div className="space-y-2 mb-4 text-xs">
                        {Object.entries(cand.options).map(([k, val]) => {
                          const isCorrect = k === cand.correct_option;
                          return (
                            <div
                              key={k}
                              className={`p-3 rounded-lg border ${
                                isCorrect
                                  ? "bg-emerald-500/10 border-emerald-500/20 text-slate-200 font-medium"
                                  : "bg-slate-950/40 border-slate-900 text-slate-400"
                              }`}
                            >
                              <span className="font-bold mr-2">{k}.</span>
                              {val}
                            </div>
                          );
                        })}
                      </div>

                      <p className="text-xs text-slate-400 bg-slate-900/60 p-3 rounded-lg border border-slate-850 mb-5 leading-normal">
                        <span className="font-bold text-slate-300 block mb-1">Explanation:</span>
                        {cand.explanation}
                      </p>

                      {/* Action buttons at the bottom */}
                      <div className="flex items-center justify-between border-t border-slate-900 pt-4 gap-4">
                        <span className="text-[10px] text-slate-500 font-medium italic">
                          💡 {cand.reasoning_detail}
                        </span>

                        <div className="flex gap-2">
                          <button
                            onClick={() => startEditing(cand)}
                            className="w-10 h-10 rounded-xl bg-slate-900 hover:bg-slate-850 border border-slate-800 text-slate-400 hover:text-slate-200 flex items-center justify-center cursor-pointer transition-colors"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => rejectCandidate(cand.id)}
                            className="w-10 h-10 rounded-xl bg-slate-900 hover:bg-rose-500/10 border border-slate-800 hover:border-rose-500/20 text-slate-500 hover:text-rose-400 flex items-center justify-center cursor-pointer transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => approveCandidate(cand.id)}
                            className="h-10 px-4 rounded-xl bg-emerald-600/10 hover:bg-emerald-600 text-emerald-400 hover:text-slate-950 border border-emerald-500/20 hover:border-emerald-600 font-bold text-xs flex items-center gap-1 cursor-pointer transition-all"
                          >
                            <CheckCircle className="w-4 h-4" />
                            Approve
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </main>
    </div>
  );
}
