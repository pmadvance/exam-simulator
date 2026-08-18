type BrandLogoProps = {
  variant?: "light" | "dark";
  size?: "compact" | "horizontal";
  showCompanyLine?: boolean;
  className?: string;
};

export function BrandLogo({
  variant = "light",
  size = "horizontal",
  showCompanyLine = false,
  className = "",
}: BrandLogoProps) {
  const dark = variant === "dark";

  return (
    <div className={`brand-logo brand-logo-${variant} brand-logo-${size} ${className}`.trim()} aria-label="PM Exam Pro">
      <div className="brand-mark" aria-hidden="true">
        <span className="brand-bar brand-bar-1" />
        <span className="brand-bar brand-bar-2" />
        <span className="brand-bar brand-bar-3" />
        <span className="brand-trend" />
        <span className="brand-check" />
      </div>
      <div className="brand-wordmark">
        <div className="brand-name">
          <span className={dark ? "brand-name-light" : ""}>PM Exam </span>
          <span className="brand-name-accent">Pro</span>
        </div>
        <div className="brand-divider" />
        <div className="brand-tagline">PASS WITH CONFIDENCE</div>
        {showCompanyLine && (
          <div className="brand-company">by PM Advance Sdn Bhd · PMI ATP #4930</div>
        )}
      </div>
    </div>
  );
}
