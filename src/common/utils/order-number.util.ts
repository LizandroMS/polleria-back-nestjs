export function generateOrderNumber(): string {
  const now = new Date();
  const yyyy = now.getFullYear().toString();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const random = Math.floor(Math.random() * 900000 + 100000);

  return `ORD-${yyyy}${mm}${dd}-${random}`;
}