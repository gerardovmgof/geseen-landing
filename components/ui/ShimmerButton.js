"use client";

// Adapted from Watermelon UI's shimmer-button (registry.watermelon.sh/r/shimmer-button.json):
// re-themed to our tokens and turned into a link so it can scroll to page anchors.

const VARIANTS = {
  primary: "bg-accent text-white",
  whatsapp: "bg-whatsapp text-black",
  ghost: "bg-transparent text-text border border-border-strong",
};

export default function ShimmerButton({
  href,
  children,
  variant = "primary",
  className = "",
  ...props
}) {
  return (
    <a
      href={href}
      className={`group relative inline-flex items-center justify-center overflow-hidden rounded-full px-6 py-3 text-sm font-medium transition-shadow duration-300 hover:shadow-[0_0_24px_-4px_var(--accent)] ${VARIANTS[variant]} ${className}`}
      {...props}
    >
      <span className="relative z-10">{children}</span>
      {variant !== "ghost" && (
        <span
          aria-hidden
          className="absolute inset-0 -translate-x-full bg-linear-to-r from-transparent via-white/30 to-transparent transition-transform duration-700 group-hover:translate-x-full"
        />
      )}
    </a>
  );
}
