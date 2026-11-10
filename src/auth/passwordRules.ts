export const PASSWORD_RULES: { label: string; test: (pw: string) => boolean }[] = [
  { label: 'At least 8 characters', test: (pw) => pw.length >= 8 },
  { label: 'At most 72 characters', test: (pw) => pw.length <= 72 },
  { label: 'Contains a letter', test: (pw) => /[A-Za-z]/.test(pw) },
  { label: 'Contains a digit', test: (pw) => /[0-9]/.test(pw) },
];

export function passwordProblem(pw: string): string | null {
  const failed = PASSWORD_RULES.find((r) => !r.test(pw));
  return failed ? `Password: ${failed.label.toLowerCase()}.` : null;
}

export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
