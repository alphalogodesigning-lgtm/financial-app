export type SeverityLevel = 'light' | 'medium' | 'brutal';

type CaptionInput = {
  severityLevel: SeverityLevel;
  amount?: number;
  bodyText?: string;
};

export function generateCaption({ severityLevel, amount = 0, bodyText = 'Roastly delivered the truth I needed.' }: CaptionInput): string {
  const amountText = amount > 0 ? `RM${amount.toFixed(0)}` : 'that';

  if (severityLevel === 'light') {
    return [
      `I almost spent ${amountText} today.`,
      'Roastly gave me a clean reality check.',
      bodyText,
      '',
      'Try it → roastly.my'
    ].join('\n');
  }

  if (severityLevel === 'brutal') {
    return [
      `I was about to make a ${amountText} decision…`,
      'Roastly said no.',
      bodyText,
      '',
      'Saved myself from financial collapse today.',
      'Try it → roastly.my'
    ].join('\n');
  }

  return [
    `Almost made a ${amountText} move today.`,
    'Roastly flagged it instantly.',
    bodyText,
    '',
    'Try it → roastly.my'
  ].join('\n');
}
