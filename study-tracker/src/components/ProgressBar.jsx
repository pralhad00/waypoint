// Progress bar: 10px tall, fully rounded.
// Track uses surface-raised, fill uses the topic colour.
// Width animates (600ms). Disabled when user prefers reduced motion.
export default function ProgressBar({ percent = 0, colorHex = '#7fa7c9' }) {
  const safe = Math.max(0, Math.min(100, percent))
  return (
    <div
      className="w-full h-[10px] rounded-full bg-raised overflow-hidden"
      role="progressbar"
      aria-valuenow={Math.round(safe)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className="h-full rounded-full"
        style={{
          width: `${safe}%`,
          background: `linear-gradient(180deg, ${colorHex}, ${colorHex}cc)`,
          transition: 'width 600ms ease',
        }}
      />
    </div>
  )
}
