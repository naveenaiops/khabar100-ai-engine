export interface Question {
  id: string;
  question_number: number;
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
  date: string;
}

export const MOCK_UPSC_QUESTIONS: Question[] = [
  {
    id: "upsc-1",
    question_number: 1,
    subject_tag: "Economy",
    question_text: "With reference to the Central Bank Digital Currency (e-Rupee) issued by the Reserve Bank of India, consider the following statements:\n1. It is a digital form of fiat currency and is legal tender.\n2. It can be converted into cash or bank deposits but does not earn any interest.\n3. It will reside on a centralized ledger managed entirely by the commercial banks.\nWhich of the statements given above are correct?",
    options: {
      A: "1 and 2 only",
      B: "2 and 3 only",
      C: "1 and 3 only",
      D: "1, 2 and 3"
    },
    correct_option: "A",
    explanation: "Statement 1 is correct: The digital Rupee (e-Rupee) is a digital token that represents legal tender and holds the same value as physical currency. Statement 2 is correct: It is convertible 1:1 with physical cash and bank deposits, but to prevent disintermediation of the banking system, it does not pay any interest. Statement 3 is incorrect: The e-Rupee ledger is operated and managed by the Reserve Bank of India (RBI) as the central issuing authority, utilizing distributed ledger technology (DLT), not commercial bank databases.",
    reasoning_type: "similar",
    reasoning_detail: "Similar to a 2020 UPSC Prelims question on the definition of legal tender and banking liquidity.",
    source_article_url: "https://www.thehindu.com/business/Economy/rbi-digital-rupee-cbdc-pilot-expansion-explained/article671234.ece",
    date: "2026-07-07"
  },
  {
    id: "upsc-2",
    question_number: 2,
    subject_tag: "Environment",
    question_text: "Consider the following statements regarding the Amur Falcon (Falco amurensis):\n1. It is a small raptor that undertakes one of the longest annual migrations of any bird of prey.\n2. Pangti village in Nagaland is known as a major stopover site, earning Nagaland the title of 'Falcon Capital of the World'.\n3. It is classified as 'Critically Endangered' on the IUCN Red List.\nWhich of the statements given above is/are correct?",
    options: {
      A: "1 only",
      B: "1 and 2 only",
      C: "2 and 3 only",
      D: "1, 2 and 3"
    },
    correct_option: "B",
    explanation: "Statement 1 is correct: Amur Falcons breed in southeastern Siberia and Northern China and migrate across the Indian Ocean to Southern Africa, traversing up to 22,000 km annually. Statement 2 is correct: Doyang reservoir and Pangti village in Wokha district, Nagaland, are famous roosting sites where millions of falcons gather, giving Nagaland the 'Falcon Capital' moniker. Statement 3 is incorrect: It is classified as 'Least Concern' on the IUCN Red List, although they are highly protected under the Wildlife Protection Act, 1972.",
    reasoning_type: "syllabus",
    reasoning_detail: "Falls under GS Paper 3 – Ecology & Biodiversity (Migratory species conservation).",
    source_article_url: "https://www.thehindu.com/sci-tech/energy-and-environment/amur-falcons-arrive-in-nagaland-conservationists-gear-up/article674512.ece",
    date: "2026-07-07"
  },
  {
    id: "upsc-3",
    question_number: 3,
    subject_tag: "Science & Tech",
    question_text: "The 'Deep Space Optical Communications (DSOC)' technology, recently in the news, is primarily designed for:",
    options: {
      A: "High-bandwidth laser-based data transmission across interplanetary distances",
      B: "Quantum key distribution for secure communication between military installations",
      C: "Sub-surface tectonic monitoring using ultra-low frequency radio waves",
      D: "Deep-ocean acoustic telemetry for tracking hydrothermal vent activity"
    },
    correct_option: "A",
    explanation: "Deep Space Optical Communications (DSOC) is a NASA technology that uses near-infrared lasers rather than traditional radio waves to transmit data from deep space. Lasers can pack data into significantly tighter waves, enabling data transmission rates up to 100 times higher than state-of-the-art radio systems, allowing high-definition streaming and rapid telemetry from Mars and beyond.",
    reasoning_type: "repeated",
    reasoning_detail: "Asked in UPSC Prelims 2018, GS Paper 1",
    source_article_url: "https://www.thehindu.com/sci-tech/science/nasa-psyche-spacecraft-lasers-first-deep-space-data-transmission/article675901.ece",
    date: "2026-07-07"
  },
  {
    id: "upsc-4",
    question_number: 4,
    subject_tag: "Polity",
    question_text: "In India, which of the following authorities is/are empowered to recommend the extension of President's Rule in a state beyond a period of one year?",
    options: {
      A: "The Governor of the concerned state exclusively",
      B: "The Election Commission of India, under specific conditions of election feasibility",
      C: "A Joint Parliamentary Committee on State Emergency Powers",
      D: "The Supreme Court of India via a presidential reference"
    },
    correct_option: "B",
    explanation: "Under Article 356, President's Rule can be extended beyond one year only if two conditions are met: (1) a National Emergency is in operation in the whole of India or in the whole or any part of the state, and (2) the Election Commission of India certifies that the continuation of President's Rule is necessary because of difficulties in holding general elections to the Legislative Assembly of the concerned state.",
    reasoning_type: "syllabus",
    reasoning_detail: "Falls under GS Paper 2 – Indian Constitution (Emergency Provisions & Federalism).",
    source_article_url: "https://www.thehindu.com/news/national/constitutional-provisions-on-presidents-rule-explained/article672109.ece",
    date: "2026-07-07"
  }
];

// Generate extra questions to make up a partial set for demonstration of scrolling
export const generateMockQuestions = (category: string, count: number): Question[] => {
  const list = category === "rpsc" ? MOCK_RPSC_QUESTIONS : MOCK_UPSC_QUESTIONS;
  const result: Question[] = [];
  
  for (let i = 0; i < count; i++) {
    const baseQuestion = list[i % list.length];
    result.push({
      ...baseQuestion,
      id: `${category}-${i + 1}`,
      question_number: i + 1,
    });
  }
  return result;
};

export const MOCK_RPSC_QUESTIONS: Question[] = [
  {
    id: "rpsc-1",
    question_number: 1,
    subject_tag: "Economy",
    question_text: "Under the Mukhyamantri Ayushman Arogya Yojana (formerly Chiranjeevi Swasthya Bima Yojana) in Rajasthan, what is the maximum cashless health insurance cover provided per family per year?",
    options: {
      A: "₹5 Lakh",
      B: "₹10 Lakh",
      C: "₹25 Lakh",
      D: "₹50 Lakh"
    },
    correct_option: "C",
    explanation: "The Mukhyamantri Ayushman Arogya Yojana of Rajasthan is a flagship state health insurance scheme providing up to ₹25 Lakh cashless medical treatment per family per year for registered families. The scheme covers treatment for critical as well as general illnesses across designated public and private hospitals, making it one of the largest state-funded health covers in India.",
    reasoning_type: "syllabus",
    reasoning_detail: "Directly maps to RPSC Syllabus Unit - Economy of Rajasthan (Welfare Flagship Schemes).",
    source_article_url: "https://www.thehindu.com/news/national/other-states/rajasthan-government-chiranjeevi-health-insurance-expansion-details/article668902.ece",
    date: "2026-07-07"
  },
  {
    id: "rpsc-2",
    question_number: 2,
    subject_tag: "History",
    question_text: "Which of the following rulers of Mewar built the famous Vijay Stambha (Tower of Victory) at Chittorgarh Fort to commemorate his victory over the combined armies of Malwa and Gujarat?",
    options: {
      A: "Rana Sanga",
      B: "Rana Kumbha",
      C: "Rana Pratap",
      D: "Bappa Rawal"
    },
    correct_option: "B",
    explanation: "Rana Kumbha built the Vijay Stambha (Tower of Victory) between 1440 and 1448 to celebrate his victory over Mahmud Khilji, the Sultan of Malwa, in the Battle of Sarangpur (1437). Dedicated to Lord Vishnu, the 9-story tower is covered with exquisite carvings of Hindu deities and represents the apex of Rajput architecture.",
    reasoning_type: "repeated",
    reasoning_detail: "Asked in RPSC RAS Prelims 2013, General Knowledge & General Science",
    source_article_url: "https://www.thehindu.com/features/kids/chittorgarh-fort-and-the-tale-of-vijay-stambha/article612451.ece",
    date: "2026-07-07"
  },
  {
    id: "rpsc-3",
    question_number: 3,
    subject_tag: "Geography",
    question_text: "Which of the following districts of Rajasthan do NOT lie within the critical desert region watered directly by the main channel of the Indira Gandhi Canal (IGNP)?",
    options: {
      A: "Jaisalmer",
      B: "Bikaner",
      C: "Sirohi",
      D: "Sriganganagar"
    },
    correct_option: "C",
    explanation: "The Indira Gandhi Canal (IGNP) waters the extremely arid northwestern districts of Rajasthan, including Sriganganagar, Hanumangarh, Bikaner, Jaisalmer, Barmer, Jodhpur, and Churu. Sirohi lies in southwestern Rajasthan along the Aravalli range and does not receive water from the main IGNP canal network.",
    reasoning_type: "similar",
    reasoning_detail: "Similar to an RPSC RAS 2021 question on irrigation networks and agricultural basins in Western Rajasthan.",
    source_article_url: "https://www.thehindu.com/news/national/other-states/indira-gandhi-canal-maintenance-impact-on-rajasthan-farmers/article671190.ece",
    date: "2026-07-07"
  }
];
