export default function LogoMark({ size = 32 }: { size?: number }) {
  return (
    <svg viewBox="0 0 200 200" width={size} height={size}>
      <rect width="200" height="200" rx="24" fill="#102944" />
      <circle cx="100" cy="100" r="76" fill="none" stroke="#c6a233" strokeWidth="3" />
      <polygon points="100,32 82,100 118,100" fill="#d9b53f" />
      <polygon points="100,168 82,100 118,100" fill="#d3dde9" />
      <circle cx="100" cy="100" r="7" fill="#102944" stroke="#c6a233" strokeWidth="2.5" />
    </svg>
  );
}
