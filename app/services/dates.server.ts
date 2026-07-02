export function nextMonthlyOrderDate(from = new Date()) {
  const year = from.getUTCFullYear();
  const month = from.getUTCMonth();
  const day = from.getUTCDate();
  const targetMonth = day < 15 ? month : month + 1;
  return new Date(Date.UTC(year, targetMonth, 15, 0, 0, 0));
}

export function followingMonthlyOrderDate(from: Date) {
  return new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth() + 1, 15, 0, 0, 0));
}

export function initialNextOrderDate(startType: "immediately" | "next_month", now = new Date()) {
  const next = nextMonthlyOrderDate(now);
  if (startType === "immediately") return next;
  return followingMonthlyOrderDate(next);
}
