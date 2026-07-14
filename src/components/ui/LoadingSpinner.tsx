export default function LoadingSpinner({
  size = "md",
  label,
  inline = false,
}: {
  size?: "sm" | "md" | "lg";
  label?: string;
  inline?: boolean;
}) {
  const sizeClasses = {
    sm: "h-5 w-5 border-2",
    md: "h-8 w-8 border-3",
    lg: "h-12 w-12 border-4",
  };

  const spinner = (
    <div
      className={`${sizeClasses[size]} animate-spin rounded-full border-[#1a2b4c] border-t-transparent`}
      role="status"
      aria-label={label || "Loading"}
    />
  );

  if (inline) {
    return (
      <span className="inline-flex items-center gap-2">
        {spinner}
        {label ? <span className="text-xs text-gray-600">{label}</span> : null}
      </span>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center gap-2 p-8">
      {spinner}
      {label ? <p className="text-sm text-gray-600">{label}</p> : null}
    </div>
  );
}
