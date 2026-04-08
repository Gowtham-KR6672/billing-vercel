export default function LoadingScreen({
  label = 'Loading workspace',
  message = 'Syncing the latest data from the server...',
  compact = false,
}) {
  return (
    <div className={`loading-shell${compact ? ' loading-shell-compact' : ''}`}>
      <div className="loading-orb" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>

      <div className="loading-copy">
        <p className="loading-label">{label}</p>
        <p className="loading-message">{message}</p>
      </div>
    </div>
  );
}
