import type { Point } from "./experience";

export type Project = {
  slug: string; title: string;
  kind: string; blurb: string; image?: string;
  points: Point[]; stack: string[];
  repo?: string; live?: string; featured: boolean;
};

export const projects: Project[] = [
  { slug: "writ", title: "Writ", featured: true,
    kind: "AI writing assistant",
    blurb: "A writing editor that underlines grammar issues as you type and rewrites selected text in the style you pick.",
    points: [
      ["A live editor that underlines grammar issues as you type. Spelling and style rules run in a Web Worker, and only the changed paragraph goes to the LLM."],
      ["A RAG pipeline with local embeddings and Upstash Vector + Redis caching, so every suggestion follows the user's own style guide."],
      ["Streamed selection rewrites (formal, concise, simplify) and version-checked autosave that never overwrites newer text."],
      ["Benchmarked on CoNLL-2014 at ", { b: "0.70 GLEU" }, "."],
    ],
    stack: ["Next.js", "TypeScript", "Upstash Vector", "Groq", "Redis"],
    repo: "https://github.com/daivikawasthi01/Grammar-Master", live: "https://getwrit.vercel.app", image: "/projects/writ.jpg" },
  { slug: "maintainability", title: "Bug-prone file predictor", featured: true,
    kind: "Machine learning",
    blurb: "Predicts which files in a codebase are most likely to need bug fixes, using signals mined from Git history.",
    points: [
      ["Mines ", { b: "19 metrics" }, " (structural, readability, developer activity) from Git history."],
      ["A genetic algorithm picks the feature subset, and an Optuna-tuned PyTorch network predicts future bug-fix activity."],
      ["Evaluated on ", { b: "1,050 files" }, " across Flask, Requests and FastAPI."],
      ["On FastAPI: ", { b: "55.6% fewer features" }, " and ", { b: "17.4% lower MSE" }, " than the all-features baseline (Wilcoxon test)."],
    ],
    stack: ["Python", "PyTorch", "Optuna", "FastAPI"],
    repo: "https://github.com/daivikawasthi01/Neuro-Genetic-Software-Maintainability",
    image: "/projects/maintainability-box.jpg" },
  { slug: "matching-engine", title: "Order matching engine", featured: true,
    kind: "Systems · C++",
    blurb: "A limit order book that matches buy and sell orders by price and time priority, with fully replayable output.",
    points: [
      ["A deterministic C++17 limit order book with price-time priority, limit/market orders, IOC/FOK, modify and cancel-by-ID."],
      ["Integer-tick prices and a strictly increasing sequence number on every event, for replayable output."],
      [{ b: "60+" }, " GoogleTest tests run under ASan/UBSan in CI."],
      ["Benchmarked at ", { b: "~139,000 orders/s" }, " on 500,000 orders."],
    ],
    stack: ["C++17", "CMake"],
    repo: "https://github.com/daivikawasthi01/Matching-Engine",
    image: "/projects/matching-engine-box.jpg" },
];

export const moreOnGithub: { name: string; kind: string; blurb: string; note: string; stack: string[]; url: string; live?: string; image?: string }[] = [
  { name: "MeetMind", kind: "AI meeting assistant",
    blurb: "Paste a transcript or upload audio or video, and get a summary, the key decisions and the action items.",
    stack: ["React", "Node.js", "Express", "MongoDB", "Gemini"],
    note: "AI meeting assistant that turns transcripts, audio or video into summaries, decisions and action items using Google Gemini, with user accounts and a meeting dashboard.",
    url: "https://github.com/daivikawasthi01/MeetMind", live: "https://meetmindz.vercel.app", image: "/projects/meetmind.jpg" },
  { name: "Retail Data Warehouse", kind: "Data engineering",
    blurb: "A SQL Server warehouse in bronze, silver and gold layers with a star schema over 1.07M retail transactions.", stack: ["T-SQL", "SQL Server"],
    note: "Bronze/Silver/Gold SQL Server warehouse with a Kimball star schema over 1.07M transactions. Covers dedup, data-quality flags and RFM analysis.",
    url: "https://github.com/daivikawasthi01/Retail-Data-Warehouse",
    image: "/projects/retail-data-warehouse-box.jpg" },
  { name: "Customer Churn Prediction", kind: "Machine learning",
    blurb: "Enter a credit-card customer's details and get their churn probability and a likely-to-leave or likely-to-stay verdict.", stack: ["Python", "XGBoost", "scikit-learn", "Streamlit"],
    note: "XGBoost churn model trained on 10k+ credit-card customers and served as a live Streamlit app that returns a churn probability.",
    url: "https://github.com/daivikawasthi01/Customer-Churn-Prediction-Model",
    live: "https://customer-churn-prediction-model-daivik-awasthi.streamlit.app", image: "/projects/churn-view.jpg" },
];

export const inTheWorks: { name: string; kind: string; blurb: string; url: string }[] = [
  { name: "Tandem", kind: "Real-time collaboration",
    blurb: "A shared code editor for pair programming: everyone in a room edits the same file live, with an AI assistant planned.",
    url: "https://github.com/daivikawasthi01/Tandem" },
];
