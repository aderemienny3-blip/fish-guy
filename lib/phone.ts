/** Normalise a Nigerian phone number to 234XXXXXXXXXX, or null if invalid. */
export function normalizeNgPhone(input: string): string | null {
  const digits = input.replace(/\D/g, "");
  let n: string;
  if (digits.startsWith("234") && digits.length === 13) n = digits;
  else if (digits.startsWith("0") && digits.length === 11) n = "234" + digits.slice(1);
  else if (digits.length === 10) n = "234" + digits;
  else return null;
  return /^234[789][01]\d{8}$/.test(n) ? n : null;
}
