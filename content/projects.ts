import type { Point } from "./experience";

export type Project = {
  slug: string; title: string;
  points: Point[]; stack: string[];
  repo?: string; live?: string; featured: boolean;
};

export const projects: Project[] = [
  { slug: "writ", title: "Writ: AI writing assistant", featured: true,
    points: [
      ["A live editor that underlines grammar issues as you type. Spelling and style rules run in a Web Worker, and only the changed paragraph goes to the LLM."],
      ["A RAG pipeline with local embeddings and Upstash Vector + Redis caching, so every suggestion follows the user's own style guide."],
      ["Streamed selection rewrites (formal, concise, simplify) and version-checked autosave that never overwrites newer text."],
      ["Benchmarked on CoNLL-2014 at ", { b: "0.70 GLEU" }, "."],
    ],
    stack: ["Next.js", "TypeScript", "Upstash Vector", "Groq", "Redis"],
    repo: "https://github.com/daivikawasthi01/Grammar-Master", live: "https://getwrit.vercel.app" },
  { slug: "maintainability", title: "Bug-prone file predictor", featured: true,
    points: [
      ["Mines ", { b: "19 metrics" }, " (structural, readability, developer activity) from Git history."],
      ["A genetic algorithm picks the feature subset, and an Optuna-tuned PyTorch network predicts future bug-fix activity."],
      ["Evaluated on ", { b: "1,050 files" }, " across Flask, Requests and FastAPI."],
      ["On FastAPI: ", { b: "55.6% fewer features" }, " and ", { b: "17.4% lower MSE" }, " than the all-features baseline (Wilcoxon test)."],
    ],
    stack: ["Python", "PyTorch", "Optuna", "FastAPI"],
    repo: "https://github.com/daivikawasthi01/Neuro-Genetic-Software-Maintainability" },
  { slug: "matching-engine", title: "Order matching engine", featured: true,
    points: [
      ["A deterministic C++17 limit order book with price-time priority, limit/market orders, IOC/FOK, modify and cancel-by-ID."],
      ["Integer-tick prices and a strictly increasing sequence number on every event, for replayable output."],
      [{ b: "60+" }, " GoogleTest tests run under ASan/UBSan in CI."],
      ["Benchmarked at ", { b: "~139,000 orders/s" }, " on 500,000 orders."],
    ],
    stack: ["C++17", "CMake"],
    repo: "https://github.com/daivikawasthi01/Matching-Engine" },
];

export const moreOnGithub: { name: string; note: string; stack: string[]; url: string; live?: string }[] = [
  { name: "Retail Data Warehouse", stack: ["T-SQL", "SQL Server"],
    note: "Bronze/Silver/Gold SQL Server warehouse with a Kimball star schema over 1.07M transactions. Covers dedup, data-quality flags and RFM analysis.",
    url: "https://github.com/daivikawasthi01/Retail-Data-Warehouse" },
  { name: "pkgr", stack: ["Go"],
    note: "Minimal npm-style package manager in Go, with registry resolution, a JSON lockfile and install/remove/list CLI commands.",
    url: "https://github.com/daivikawasthi01/Go-pkgr" },
  { name: "Customer Churn Prediction", stack: ["TensorFlow", "Streamlit"],
    note: "Neural-net churn model trained on 10k+ credit-card customers and served as a live Streamlit app.",
    url: "https://github.com/daivikawasthi01/Customer-Churn-Prediction-Model" }, // TODO(Daivik): add Streamlit live URL
  { name: "Tandem", stack: ["TypeScript"], // TODO(Daivik): confirm description and stack
    note: "Real-time AI pair programming, with two people and an AI in one shared editor.",
    url: "https://github.com/daivikawasthi01/Tandem" },
];
