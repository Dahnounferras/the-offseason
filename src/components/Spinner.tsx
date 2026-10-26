export default function Spinner() {
  return (
    <svg
      className="animate-spin"
      style={{ width: "1em", height: "1em", display: "inline-block", verticalAlign: "middle" }}
      viewBox="0 0 24 24"
      fill="none"
    >
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.25" />
      <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}
