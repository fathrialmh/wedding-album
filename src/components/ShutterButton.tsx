type ShutterButtonProps = {
  onClick: () => void;
  disabled?: boolean;
  loading?: boolean;
};

export default function ShutterButton({
  onClick,
  disabled = false,
  loading = false,
}: ShutterButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || loading}
      aria-label="Ambil foto"
      className="group relative flex h-20 w-20 items-center justify-center disabled:cursor-not-allowed disabled:opacity-50"
    >
      <span className="absolute inset-0 rounded-full border-4 border-white/80 transition group-hover:border-white" />
      <span
        className={`h-14 w-14 rounded-full bg-white transition ${
          loading ? "scale-90 opacity-70" : "group-hover:scale-95"
        }`}
      />
    </button>
  );
}
