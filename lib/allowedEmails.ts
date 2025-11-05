export function isAllowedEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const raw = process.env.NEXT_PUBLIC_ALLOWED_EMAILS || '';
  const list = raw.split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
  return list.includes(email.toLowerCase());
}
