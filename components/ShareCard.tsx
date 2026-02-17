import React from 'react';

type SeverityLevel = 'light' | 'medium' | 'brutal';

type ShareCardProps = {
  title: string;
  bodyText: string;
  stats?: Record<string, string | number>;
  severityLevel: SeverityLevel;
  appWatermark?: boolean;
};

const severityAccent: Record<SeverityLevel, string> = {
  light: '#89ABE3',
  medium: '#D4AF37',
  brutal: '#FF6B6B'
};

export function ShareCard({ title, bodyText, stats = {}, severityLevel, appWatermark = true }: ShareCardProps) {
  return (
    <div
      style={{
        width: 1080,
        height: 1920,
        background: '#0A0A0A',
        color: '#F2F2F2',
        border: '1px solid rgba(255,255,255,0.08)',
        padding: '150px 92px 120px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif'
      }}
    >
      <div>
        <p style={{ color: severityAccent[severityLevel], letterSpacing: '0.16em', textTransform: 'uppercase', fontSize: 30, marginBottom: 36 }}>
          Roastly Insight
        </p>
        <h2 style={{ fontSize: 126, lineHeight: 0.98, letterSpacing: '-0.05em', marginBottom: 58 }}>{title}</h2>
        <p style={{ fontSize: 54, lineHeight: 1.22, fontWeight: 600, maxWidth: 840 }}>{bodyText}</p>
      </div>

      <div>
        <div style={{ paddingTop: 8, display: 'grid', gap: 26, gridTemplateColumns: 'repeat(2, minmax(0,1fr))', marginBottom: 56 }}>
          {Object.entries(stats).slice(0, 4).map(([label, value], index) => {
            const isAmount = index === 0;
            return (
              <div key={label}>
                <p style={{ color: '#8A8A8A', fontSize: 24, marginBottom: 8 }}>{label}</p>
                <p style={{ fontSize: isAmount ? 72 : 52, lineHeight: 1, fontWeight: isAmount ? 800 : 760 }}>{String(value)}</p>
              </div>
            );
          })}
        </div>

        {appWatermark && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 12, opacity: 0.62 }}>
            <span style={{ fontSize: 34, fontWeight: 700, letterSpacing: '0.02em' }}>Roastly</span>
            <span style={{ width: 30, height: 30, borderRadius: 8, border: '2px solid rgba(212,175,55,0.8)', display: 'inline-block' }} />
          </div>
        )}
      </div>
    </div>
  );
}

export default ShareCard;
