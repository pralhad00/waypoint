// Status chip: small pill, tinted background, no harsh borders.
// Real Ahead / On track / Behind math comes in Job 7 (src/utils/).
// Job 5 shows a neutral placeholder so layout can be tested.
const STYLES = {
  ahead: { background: '#8fb39b33', color: '#8fb39b' },
  'on-track': { background: '#7fa7c933', color: '#7fa7c9' },
  behind: { background: '#cf9a7e33', color: '#cf9a7e' },
}

export default function StatusChip({ status = 'on-track' }) {
  const label =
    status === 'ahead' ? 'Ahead' : status === 'behind' ? 'Behind' : 'On track'
  return (
    <span
      className="rounded-full px-2.5 py-0.5 text-[12px] font-medium"
      style={STYLES[status] || STYLES['on-track']}
    >
      {label}
    </span>
  )
}
