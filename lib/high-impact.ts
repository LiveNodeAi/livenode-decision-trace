const japaneseCoreTerms = [
  "医療", "診断", "治療", "処方", "法律", "法的", "訴訟", "契約書", "金融", "投資", "融資", "税務",
];

const englishCoreTerms = [
  "medical", "diagnosis", "treatment", "prescription", "legal", "lawsuit", "contract", "financial", "investment", "loan", "tax advice",
];

export function isHighImpactMemo(memo: string): boolean {
  if (japaneseCoreTerms.some((term) => memo.includes(term))) return true;
  const lower = memo.toLowerCase();
  return englishCoreTerms.some((term) => new RegExp(`\\b${term.replace(" ", "\\s+")}\\b`, "u").test(lower));
}
