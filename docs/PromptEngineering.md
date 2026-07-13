# Prompt Engineering & UPSC Blueprint Archetypes

This document explores the **Prompt Engineering, System Instructions, and Structured JSON Formats** utilized in **Khabar100 2.0**. It outlines how we design instructions to force LLM models to generate high-rigor UPSC Civil Services Examination (CSE) GS1 Prelims questions with 100% structured JSON outputs and zero syntax errors.

---

## 1. Structured JSON Output Gating

Generating structured JSON from Large Language Models can be notoriously brittle, especially with long, complex, and highly academic text like UPSC questions. To ensure perfect JSON formatting without parser crashes, Khabar100 2.0 implements three design rules:

1. **API-Level Enforcement**: In `openrouter.ts`, we pass `response_format: { type: "json_object" }` inside the API request body, forcing the underlying model to respond in valid JSON.
2. **Defensive Parsing Wrapper**: In `pipeline.ts`, the `cleanAndParseJSON` helper removes any Markdown code fences (e.g., ` ```json ... ``` `), slices the text between the first `{` and last `}`, and cleans unescaped control characters before parsing.
3. **Escaping Instructions**: System prompts explicitly demand that double quotes inside text blocks are strictly escaped to prevent premature JSON termination.

---

## 2. UPSC Blueprint Archetype Systems

UPSC GS1 Prelims questions have distinct historical patterns, styling, and traps. We codify these patterns into "Blueprint Archetypes" inside our system prompts to guide the generation process:

### Archetype A: The 3-Statement Dynamic-Static Hybrid
The classic UPSC Prelims question testing governance, legislative bills, or treaties.
- **Statement 1 (Dynamic)**: Tests present-day news (e.g., *“The Biological Diversity (Amendment) Bill, 2023 was recently introduced in Parliament...”*).
- **Statement 2 (Static Background)**: Tests statutory or historical foundation (e.g., *“The original Act of 2002 was enacted to meet obligations under the Convention on Biological Diversity...”*).
- **Statement 3 (Structural Gating/Ministry)**: Tests administrative control or parent acts, often incorporating a subtle trap (e.g., *“The National Biodiversity Authority is a statutory body under the Ministry of Environment, Forest and Climate Change...”*).

### Archetype B: Modern UPSC Option Formats
Historically, statement questions used options like *"1 and 2 only"*, *"2 and 3 only"*, etc., allowing students to solve them via elimination. In 2023, UPSC completely overhauled options to:
- **Option A**: *Only one* (Exactly one statement is correct)
- **Option B**: *Only two* (Exactly two statements are correct)
- **Option C**: *All three* (All three statements are correct)
- **Option D**: *None* (No statements are correct)

Our prompts strictly enforce this modern structure, which forces students to know the factual truth of every statement, eliminating the possibility of guessing.

---

## 3. Core Synthesis System Instructions

Below is a snippet of our production-grade system instruction illustrating how the synthesis prompt enforces these archetypes:

```text
You are an expert UPSC GS1 Paper Examiner.
Generate a highly challenging, standard UPSC MCQ question using the provided Dimension context and augmented search data.

SPECIFIC STRUCTURAL INSTRUCTION:
- Opening Style: "With reference to the news, consider the following statements:"
- Structural Guide: Create a standard 3-statement UPSC hybrid question (Statement 1: Dynamic Current Event; Statement 2: Static background/Concept; Statement 3: Parent Ministry/Act). Use strict modern UPSC options: 'Only one', 'Only two', 'All three', 'None'.

Additional Instructions:
- SWAP parent ministries, modify ratios, or insert subtle qualifiers as defined in UPSC traps.
- Ensure the question matches the 16-Year UPSC Prelims GS1 style.

Output format must be EXACTLY JSON matching this structure:
{
  "question": "The complete UPSC-standard question text.",
  "options": {
    "A": "Option text A",
    "B": "Option text B",
    "C": "Option text C",
    "D": "Option text D"
  },
  "correct_option": "A|B|C|D",
  "explanation": "A complete, deep conceptual explanation citing the reasons why options or statements are true or false."
}
```

By engineering prompts that merge explicit structural patterns with programmatic JSON constraints, Khabar100 2.0 bridges the gap between raw AI outputs and high-fidelity, exam-ready academic resources.
