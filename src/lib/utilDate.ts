// formatte une Date en "YYYY-MM-DD" en utilisant la date LOCALE (pas toISOString)
export function formatDateKeyLocal(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// parse "YYYY-MM-DD" en Date locale (new Date(year, month-1, day))
export function parseDateKeyLocal(s: string) {
  const [y, m, day] = s.split("-").map(Number);
  return new Date(y, m - 1, day);
}
