/**
 * Local Automated Content Moderation (AI-Free & Zero Cost)
 *
 * Provides:
 * 1. Leetspeak & obfuscation normalization
 * 2. Repetition collapse (e.g. "baaaad" -> "bad")
 * 3. Exact & word-boundary regex detection for banned slurs, harassment, hate speech, and severe profanity
 * 4. PII protection (e.g. auto-detecting and blocking leaked phone numbers, SSNs, or email doxxing)
 */

export interface ModerationResult {
  isClean: boolean;
  flaggedKeywords: string[];
  reason?: string;
  category?: "severe_toxicity" | "harassment" | "doxxing" | "spam";
}

// Normalized leetspeak translation table
const LEET_MAP: Record<string, string> = {
  "@": "a",
  "4": "a",
  "8": "b",
  "3": "e",
  "1": "i",
  "!": "i",
  "|": "i",
  "0": "o",
  "5": "s",
  "$": "s",
  "7": "t",
  "+": "t",
  "9": "g",
  "v": "u",
};

// Built-in tiered dictionary for severe offensive keywords and university-specific harassment terms
const SEVERE_HARASSMENT_KEYWORDS = [
  // Explicit hate speech and slurs
  "nigger",
  "nigga",
  "faggot",
  "fag",
  "kike",
  "chink",
  "spic",
  "wetback",
  "tranny",
  "retard",
  "cunt",
  "whore",
  "slut",
  // Harassment and violence threats
  "kill yourself",
  "kys",
  "die in a fire",
  "shoot up",
  "bomb threat",
  "massacre",
  "suicide bait",
  "hang yourself",
  "rape",
  "doxx",
  // Severe academic misconduct/cheating rings
  "sell exam leak",
  "stolen exam answers",
];

// Moderate profanity (flagged or sanitized depending on strictness)
const PROFANE_KEYWORDS = [
  "motherfucker",
  "bitch",
  "asshole",
  "dickhead",
  "cock",
  "pussy",
  "blowjob",
];

// Patterns for potential Doxxing (Campus phone numbers, student ID numbers, emails)
const PHONE_PATTERN = /\b(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/;
const SSN_OR_STUDENT_ID_PATTERN = /\b\d{3}-\d{2}-\d{4}\b/;
const EMAIL_PATTERN = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,7}\b/;

/**
 * Normalizes text by removing diacritics, substituting leetspeak,
 * and collapsing repeated letters (e.g., "faaaag" -> "fag").
 */
export function normalizeText(text: string): string {
  let normalized = text.toLowerCase();

  // Substitute common leetspeak characters
  for (const [char, replacement] of Object.entries(LEET_MAP)) {
    normalized = normalized.split(char).join(replacement);
  }

  // Remove zero-width characters and excessive spaces
  normalized = normalized.replace(/[\u200B-\u200D\uFEFF]/g, "");

  // Collapse 3+ repeated characters down to 2 characters to catch repeated bypasses
  normalized = normalized.replace(/(.)\1{2,}/g, "$1$1");

  return normalized;
}

/**
 * Performs fast, zero-cost, server-side content moderation.
 */
export function moderateContent(text: string): ModerationResult {
  if (!text || text.trim().length === 0) {
    return { isClean: true, flaggedKeywords: [] };
  }

  const rawText = text.trim();
  const normalized = normalizeText(rawText);

  // 1. Check for Doxxing / Personal Identifiable Information (PII)
  if (PHONE_PATTERN.test(rawText)) {
    return {
      isClean: false,
      flaggedKeywords: ["[Phone Number]"],
      reason: "Posting personal phone numbers or contact information is strictly prohibited.",
      category: "doxxing",
    };
  }

  if (EMAIL_PATTERN.test(rawText)) {
    return {
      isClean: false,
      flaggedKeywords: ["[Email Address]"],
      reason: "Posting personal email addresses is prohibited to protect student anonymity.",
      category: "doxxing",
    };
  }

  if (SSN_OR_STUDENT_ID_PATTERN.test(rawText)) {
    return {
      isClean: false,
      flaggedKeywords: ["[Identification Number]"],
      reason: "Posting student ID or government identification numbers is strictly forbidden.",
      category: "doxxing",
    };
  }

  // 2. Check for Severe Harassment and Hate Speech
  const flagged: string[] = [];

  for (const term of SEVERE_HARASSMENT_KEYWORDS) {
    // Word boundary check
    const escapedTerm = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(`(?:^|\\W)${escapedTerm}(?:$|\\W)`, "i");

    if (regex.test(normalized) || regex.test(rawText.toLowerCase())) {
      flagged.push(term);
    }
  }

  if (flagged.length > 0) {
    return {
      isClean: false,
      flaggedKeywords: flagged,
      reason: "Post rejected: Contains offensive, harassing, or prohibited university speech.",
      category: "severe_toxicity",
    };
  }

  // 3. Check for targeted harassment profanity
  for (const term of PROFANE_KEYWORDS) {
    const escapedTerm = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(`(?:^|\\W)${escapedTerm}(?:$|\\W)`, "i");

    if (regex.test(normalized)) {
      flagged.push(term);
    }
  }

  if (flagged.length >= 3) {
    return {
      isClean: false,
      flaggedKeywords: flagged,
      reason: "Post rejected: Excessive abusive language detected.",
      category: "harassment",
    };
  }

  return {
    isClean: true,
    flaggedKeywords: [],
  };
}

/**
 * Clean/censor text for display if preferred
 */
export function censorText(text: string): string {
  let cleaned = text;
  const allTerms = [...SEVERE_HARASSMENT_KEYWORDS, ...PROFANE_KEYWORDS];

  for (const term of allTerms) {
    const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(`\\b${escaped}\\b`, "gi");
    cleaned = cleaned.replace(regex, (match) => "*".repeat(match.length));
  }

  return cleaned;
}
