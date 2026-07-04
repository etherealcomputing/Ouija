// The Ethereal Computing crescent — an inline SVG so it's crisp at any size,
// theme-native, and fully self-contained (no external asset to load).

export function EtherealMark({ size = 34, className = "" }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      className={className}
      role="img"
      aria-label="Ethereal Computing"
    >
      <defs>
        <linearGradient id="ec-crescent" x1="0.15" y1="0.1" x2="0.9" y2="0.95">
          <stop offset="0" stopColor="#ff9ecb" />
          <stop offset="0.45" stopColor="#f82090" />
          <stop offset="1" stopColor="#d80f74" />
        </linearGradient>
        <mask id="ec-crescent-mask">
          <rect width="100" height="100" fill="black" />
          {/* Outer disc minus an up-left-offset disc → a crescent open at the upper-left. */}
          <circle cx="52" cy="52" r="40" fill="white" />
          <circle cx="38" cy="40" r="35" fill="black" />
        </mask>
      </defs>
      <rect width="100" height="100" fill="url(#ec-crescent)" mask="url(#ec-crescent-mask)" />
    </svg>
  )
}
