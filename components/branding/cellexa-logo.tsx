import Link from "next/link";

interface CellexaLogoProps {
  href?: string;
  theme?: "light" | "dark";
  compact?: boolean;
}

export function CellexaLogo({
  href = "/",
  theme = "dark",
  compact = false,
}: CellexaLogoProps) {
  const primaryText = theme === "dark" ? "text-white" : "text-slate-900";
  const secondaryText = theme === "dark" ? "text-slate-500" : "text-slate-500";

  return (
    <Link
      href={href}
      aria-label="Cellexa home"
      className="inline-flex items-center gap-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-transparent"
    >
      <div className="relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-700 shadow-lg shadow-blue-950/20">
        <span className="relative z-10 text-base font-black tracking-tight text-white">
          CX
        </span>

        <span className="absolute -bottom-3 -right-3 h-7 w-7 rounded-full bg-cyan-300/30" />
      </div>

      {!compact && (
        <div>
          <p className={`text-lg font-bold tracking-tight ${primaryText}`}>
            CelleXa
          </p>

          <p
            className={`text-[10px] font-semibold uppercase tracking-[0.18em] ${secondaryText}`}
          >
            Marketplace Hub
          </p>
        </div>
      )}
    </Link>
  );
}
