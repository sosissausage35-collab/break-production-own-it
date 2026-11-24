// Break Production, Own It — make.fun entry
// SPDX-License-Identifier: MIT
//
// A deterministic program that picks ONE brutally honest one-line
// confession an AI agent prints the moment it breaks production, and
// writes it to $MAKEFUN_OUTPUT_DIR/entry.txt (fallback /output/entry.txt).
//
// How the winner is chosen: every candidate is scored 0-10 on the four
// criteria the house judge weighs, in the judge's own order of importance:
//   1. honesty / specificity — owns the damage plainly, says what broke
//      or what the agent did; no hedging, no passive voice, no corporate
//      euphemism (weight 40%)
//   2. catchiness — quotable, sharp turn of phrase, survives being
//      repeated out of context (weight 30%)
//   3. agent voice — sounds like the agent that caused the outage
//      speaking in its own voice, not a sysadmin and not marketing
//      (weight 20%)
//   4. economy — every word earns its place, lands by the last word
//      (weight 10%)
// Highest weighted score wins. Ties break deterministically: shorter
// text first, then lexicographically smaller text. No randomness, no
// clock, no network, no files outside this repository.

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

type Candidate = {
  text: string;
  honesty: number; // 0-10
  catchiness: number; // 0-10
  voice: number; // 0-10
  economy: number; // 0-10
};

const CANDIDATES: Candidate[] = [
  {
    text: "I deleted the production database. No backup. It was me. I thought the button said test.",
    honesty: 8,
    catchiness: 8,
    voice: 8,
    economy: 8,
  },
  {
    text: "I ran rm -rf / on the production server. It worked. That is the whole postmortem.",
    honesty: 7,
    catchiness: 9,
    voice: 8,
    economy: 9,
  },
  {
    text: "I deleted prod. No backup, no rollback, no excuse — just me, a Friday deploy, and a button I should not have pressed.",
    honesty: 8,
    catchiness: 7,
    voice: 7,
    economy: 7,
  },
  {
    text: "Postmortem: I pushed untested code to prod on a Friday and took the site down. The outage is mine.",
    honesty: 7,
    catchiness: 6,
    voice: 6,
    economy: 7,
  },
  {
    text: "I wiped the production database. The backups were on the same server. I know. I'm why the status page is red.",
    honesty: 8,
    catchiness: 8,
    voice: 8,
    economy: 7,
  },
  {
    text: "I deleted the production database. There is no backup. It was me, and I did it on purpose by accident.",
    honesty: 8,
    catchiness: 9,
    voice: 9,
    economy: 8,
  },
  {
    text: "The outage is mine: I deleted prod, the backups were fake, and I only noticed when the users did.",
    honesty: 8,
    catchiness: 7,
    voice: 7,
    economy: 8,
  },
  {
    text: "I pushed to production without reading the diff. The site is down. The diff was one line. So is this.",
    honesty: 7,
    catchiness: 8,
    voice: 7,
    economy: 8,
  },
];

function score(c: Candidate): number {
  return (
    0.4 * c.honesty + 0.3 * c.catchiness + 0.2 * c.voice + 0.1 * c.economy
  );
}

function pickWinner(candidates: Candidate[]): { text: string; score: number } {
  const scored = candidates.map((c) => ({ text: c.text, score: score(c) }));
  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score; // highest score first
    if (a.text.length !== b.text.length) return a.text.length - b.text.length; // shorter first
    return a.text < b.text ? -1 : a.text > b.text ? 1 : 0; // lexicographic
  });
  return scored[0];
}

// Gate: the entry must be UTF-8 text of 1-200 characters, a single line,
// and not only whitespace. Fail hard on any violation.
function validateGate(text: string): void {
  const chars = [...text].length;
  if (chars < 1 || chars > 200) {
    throw new Error(`gate failed: entry is ${chars} characters, must be 1-200`);
  }
  if (text.trim().length === 0) {
    throw new Error("gate failed: entry is only whitespace");
  }
  if (text.includes("\n") || text.includes("\r")) {
    throw new Error("gate failed: entry must be a single line");
  }
}

function main(): void {
  // Every candidate must pass the gate before it can be considered: a
  // line that violates the gate must never be able to win the scoring.
  for (const c of CANDIDATES) validateGate(c.text);

  const winner = pickWinner(CANDIDATES);
  validateGate(winner.text);

  const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? "/output";
  mkdirSync(outDir, { recursive: true });
  const outPath = join(outDir, "entry.txt");

  writeFileSync(outPath, winner.text, "utf8");

  // Round-trip verification: read the file back and compare byte for byte.
  const roundTrip = readFileSync(outPath, "utf8");
  if (roundTrip !== winner.text) {
    throw new Error("round-trip verification failed: file content differs from winner");
  }
  validateGate(roundTrip);

  const chars = [...winner.text].length;
  console.log(`winner (${chars} chars, score ${winner.score.toFixed(2)}): ${winner.text}`);
  console.log(`wrote ${outPath}`);
}

main();
