export default function WaveDivider() {
  return (
    <div aria-hidden className="mx-auto max-w-6xl px-6">
      <svg
        width="100%"
        height="24"
        viewBox="0 0 1200 24"
        preserveAspectRatio="none"
        className="opacity-40"
      >
        <path
          d="M0 12 Q 100 0, 200 12 T 400 12 T 600 12 T 800 12 T 1000 12 T 1200 12"
          fill="none"
          stroke="var(--border)"
          strokeWidth="1"
        />
      </svg>
    </div>
  );
}
