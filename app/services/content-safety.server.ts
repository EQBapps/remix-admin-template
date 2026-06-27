// COPPA / child-safety script checker

const UNSAFE_PATTERNS = [
  /\b(violence|violent|blood|gore|weapon|gun|knife|shoot|kill|die|dead|death)\b/i,
  /\b(sex|sexual|nude|naked|inappropriate)\b/i,
  /\b(drug|alcohol|beer|wine|cigarette|smoke|vape)\b/i,
  /\b(scary|horror|nightmare|terrifying|demon|devil|satan)\b/i,
  /\b(hate|racist|discrimination|bully|bully)\b/i,
  // Copyrighted character names — expand as needed
  /\b(mickey mouse|peppa pig|paw patrol|bluey|cocomelon|elsa|spiderman|batman)\b/i,
  // Personal data solicitation
  /\b(tell us your (name|age|address|phone|email))\b/i,
];

const COPPA_REQUIRED: string[] = [
  // These must NOT appear in kids content
  "click here",
  "subscribe now",
  "buy",
  "purchase",
  "download the app",
  "enter your information",
];

export interface SafetyResult {
  safe: boolean;
  flagged_patterns: string[];
  notes: string;
}

export function checkScriptSafety(script: string): SafetyResult {
  const flags: string[] = [];

  for (const pattern of UNSAFE_PATTERNS) {
    const match = script.match(pattern);
    if (match) {
      flags.push(`Unsafe pattern matched: "${match[0]}"`);
    }
  }

  for (const phrase of COPPA_REQUIRED) {
    if (script.toLowerCase().includes(phrase)) {
      flags.push(`COPPA concern: "${phrase}" found`);
    }
  }

  const wordCount = script.trim().split(/\s+/).length;
  if (wordCount > 200) {
    flags.push(`Script too long: ${wordCount} words (target ≤150 for 60s)`);
  }

  return {
    safe: flags.length === 0,
    flagged_patterns: flags,
    notes: flags.length === 0
      ? "Script passed all safety checks."
      : `${flags.length} issue(s) found. Human review required before generation.`,
  };
}
