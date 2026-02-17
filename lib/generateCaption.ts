export type SeverityLevel = 'light' | 'medium' | 'brutal';

type CaptionInput = {
  severityLevel: SeverityLevel;
  amount?: number;
  runwayDays?: number;
  bodyText?: string;
};

const stripToPunchyLine = (line: string): string => {
  if (!line) return 'Reality check delivered.';
  return line.split(/[.!?]/)[0].trim() || 'Reality check delivered.';
};

export function generateCaption({ severityLevel, amount = 0, runwayDays, bodyText = 'Roastly delivered the truth.' }: CaptionInput): string {
  const amountText = amount > 0 ? `RM${amount.toFixed(0)}` : 'this move';
  const runwayText = Number.isFinite(runwayDays) ? `${Math.max(0, Math.floor(runwayDays))} days` : 'watch your runway';
  const punchLine = stripToPunchyLine(bodyText);

  if (severityLevel === 'light') {
    return [
      `${amountText} move detected.`,
      `Runway: ${runwayText}.`,
      'Clean save by Roastly.',
      'Try it → roastly.my'
    ].join('\n');
  }

  if (severityLevel === 'brutal') {
    return [
      `${amountText} move detected.`,
      `Runway: ${runwayText}.`,
      `${punchLine}.`,
      'Try it → roastly.my'
    ].join('\n');
  }

  return [
    `${amountText} move detected.`,
    `Runway: ${runwayText}.`,
    "That's tight.",
    'Try it → roastly.my'
  ].join('\n');
}
