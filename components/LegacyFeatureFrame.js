export default function LegacyFeatureFrame({ src, title }) {
  return (
    <iframe
      src={src}
      title={title}
      style={{
        width: '100%',
        minHeight: 'calc(100vh - 170px)',
        border: '1px solid rgba(255, 255, 255, 0.06)',
        borderRadius: '16px',
        background: '#0a0a0a'
      }}
    />
  );
}
