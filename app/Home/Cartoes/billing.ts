export function parseISODate(iso: string) {
  const [y, m, d] = iso.split('-').map((x) => Number(x));
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

export function daysInMonth(year: number, monthIndex: number) {
  return new Date(year, monthIndex + 1, 0).getDate();
}

export function clampDay(year: number, monthIndex: number, day: number) {
  const max = daysInMonth(year, monthIndex);
  return Math.max(1, Math.min(max, day));
}

export function addMonthsClamped(base: Date, monthsToAdd: number, dayWanted: number) {
  const y = base.getFullYear();
  const m = base.getMonth();
  const targetMonthIndex = m + monthsToAdd;
  const target = new Date(y, targetMonthIndex, 1);
  const dd = clampDay(target.getFullYear(), target.getMonth(), dayWanted);
  return new Date(target.getFullYear(), target.getMonth(), dd);
}

export function addMonths(base: Date, monthsToAdd: number, dayWanted?: number) {
  const day = typeof dayWanted === 'number' ? dayWanted : base.getDate();
  return addMonthsClamped(base, monthsToAdd, day);
}

export function toYM(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

export function parcelaDueDate(
  compraISO: string,
  diaBomCompra: number,
  diaPagamento: number,
  parcelaIndex: number
) {
  const compraDate = parseISODate(compraISO) ?? new Date();

  void diaBomCompra;

  const pagamento = Math.max(1, Math.min(31, Number(diaPagamento) || 10));

  const primeira = addMonthsClamped(compraDate, 1, pagamento);
  const venc = addMonthsClamped(primeira, Math.max(0, parcelaIndex - 1), pagamento);

  return venc;
}

export function formatBR(isoYYYYMMDD: string) {
  const d = parseISODate(isoYYYYMMDD);
  if (!d) return isoYYYYMMDD;
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yy = d.getFullYear();
  return `${dd}/${mm}/${yy}`;
}
