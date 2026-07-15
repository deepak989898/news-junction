import { createElement } from "react";

/**
 * Colorful gradient section/page heading used across the public site.
 * Renders gradient-clipped text plus a short accent bar underneath so every
 * main heading looks consistent and vibrant.
 */
export default function SectionHeading({
  children,
  as = "h2",
  size = "text-xl",
  className = "",
  bar = true,
}: {
  children: React.ReactNode;
  as?: "h1" | "h2" | "h3";
  size?: string;
  className?: string;
  bar?: boolean;
}) {
  const gradient = "from-[#c41e20] via-[#e85d04] to-[#1a2b4c]";
  return (
    <div className={className}>
      {createElement(
        as,
        {
          className: `inline-block bg-gradient-to-r ${gradient} bg-clip-text font-extrabold tracking-tight text-transparent ${size}`,
        },
        children
      )}
      {bar && <div className={`mt-1.5 h-1 w-14 rounded-full bg-gradient-to-r ${gradient}`} />}
    </div>
  );
}
