export function BrandMark({ className = '' }: { className?: string }) {
  return (
    <span className={`brand-mark ${className}`.trim()}>
      <svg className="brand-mark-icon" viewBox="0 0 64 64" aria-hidden="true">
        <circle cx="32" cy="32" r="30" fill="rgba(255,255,255,0.06)" />
        <circle cx="32" cy="32" r="28.6" fill="none" stroke="currentColor" strokeWidth="2.35" />
        <circle cx="32" cy="32" r="25.4" fill="none" stroke="currentColor" strokeWidth="0.7" opacity="0.45" />
        <path
          d="M32 13.6v37"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.7"
          strokeLinecap="round"
        />
        <circle cx="32" cy="13.2" r="2.55" fill="currentColor" />
        <path
          className="brand-mark-snake"
          d="M38.4 16.6C42 19.8 23.2 21.4 25.6 25.6c2.4 4.2 14.8 5.4 12.4 9.8-2.4 4.4-14.6 5.6-12 10 2.2 3.6 11.2 5.4 8.2 8.2"
          fill="none"
          strokeWidth="3.35"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <span className="brand-mark-text">
        <span className="brand-mark-med">MED</span>
        <span className="brand-mark-donish">donish</span>
      </span>
    </span>
  );
}
