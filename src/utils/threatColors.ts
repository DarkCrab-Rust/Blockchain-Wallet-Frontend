export const threatColors: Record<string, string> = {
  None: '#10b981',
  Low: '#3b82f6',
  Medium: '#f59e0b',
  High: '#f97316',
  Critical: '#ef4444',
};

export type ThreatLevelKey = keyof typeof threatColors;

export function getThreatColor(level: string | undefined): string {
  if (!level) return '#6b7280';
  const key = String(level) as ThreatLevelKey;
  return threatColors[key] ?? '#6b7280';
}