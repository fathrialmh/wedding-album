"use client";

type LikeButtonProps = {
  liked: boolean;
  count: number;
  loading?: boolean;
  size?: "sm" | "md";
  onToggle: () => void;
};

export default function LikeButton({
  liked,
  count,
  loading = false,
  size = "md",
  onToggle,
}: LikeButtonProps) {
  const iconSize = size === "sm" ? "h-4 w-4" : "h-5 w-5";
  const textSize = size === "sm" ? "text-xs" : "text-sm";

  return (
    <button
      type="button"
      onClick={(event) => {
        event.stopPropagation();
        onToggle();
      }}
      disabled={loading}
      aria-pressed={liked}
      aria-label={liked ? "Batalkan suka" : "Suka foto"}
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 transition disabled:opacity-50 ${
        liked
          ? "border-rose-400/50 bg-rose-500/20 text-rose-200"
          : "border-white/20 bg-black/50 text-white/80 hover:border-white/35 hover:text-white"
      } ${textSize}`}
    >
      <svg
        viewBox="0 0 24 24"
        className={iconSize}
        fill={liked ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="1.8"
        aria-hidden="true"
      >
        <path d="M12 21s-6.7-4.35-9.33-8.1C.74 9.74 2.1 5.9 6.1 5.2c2.03-.37 3.9.52 5.05 2.05 1.15-1.53 3.02-2.42 5.05-2.05 3.99.7 5.35 4.54 3.43 7.7C18.7 16.65 12 21 12 21z" />
      </svg>
      <span>{count}</span>
    </button>
  );
}
