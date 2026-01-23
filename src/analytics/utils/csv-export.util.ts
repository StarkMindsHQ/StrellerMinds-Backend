export function toCSV(data: any[]): string {
  if (!data.length) return '';

  const headers = Object.keys(data[0]);
  const rows = data.map(row =>
    headers.map(h => JSON.stringify(row[h] ?? '')).join(','),
  );

  return [headers.join(','), ...rows].join('\n');
}
