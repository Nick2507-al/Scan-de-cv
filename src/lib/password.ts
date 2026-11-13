/** Même politique que le serveur : 10 caractères minimum, au moins une lettre et un chiffre. */
export function passwordProblems(pw: string) {
  const issues = [];
  if (pw.length < 10) issues.push("10 caractères minimum");
  if (!/[A-Za-zÀ-ÿ]/.test(pw) || !/\d/.test(pw)) issues.push("au moins une lettre et un chiffre");
  return issues;
}
