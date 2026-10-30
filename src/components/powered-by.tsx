const HACKATHON_URL = "https://nebiusglobalaihackathon.devpost.com";

const logoLink = "flex items-center gap-2.5 rounded-lg opacity-85 outline-none transition-[opacity,transform] duration-200 hover:-translate-y-0.5 hover:opacity-100 focus-visible:ring-2 focus-visible:ring-white/60";

/** The stack the show runs on, and where it was made. Logos are the vendors' own files from their sites. */
export function PoweredBy() {
  return (
    <section aria-label="Runs on" className="flex w-full max-w-2xl flex-col items-center gap-5 border-t border-white/10 pt-8">
      <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-white/40">Runs on</p>
      <div className="flex flex-wrap items-center justify-center gap-x-7 gap-y-4">
        <a href="https://nebius.com/token-factory" target="_blank" rel="noopener" className={logoLink}>
          {/* eslint-disable-next-line @next/next/no-img-element -- a static vendor SVG, nothing to optimize */}
          <img src="/brands/nebius.svg" alt="Nebius" width={87} height={24} className="h-6 w-auto" />
          <span className="text-base font-bold tracking-tight text-white">Token Factory</span>
        </a>
        <span className="h-7 w-px bg-white/15 max-sm:hidden" aria-hidden />
        <a href="https://www.tavily.com" target="_blank" rel="noopener" className={logoLink}>
          {/* eslint-disable-next-line @next/next/no-img-element -- a static vendor SVG, nothing to optimize */}
          <img src="/brands/tavily.svg" alt="Tavily" width={100} height={30} className="h-[30px] w-auto" />
        </a>
      </div>
      <p className="max-w-md text-sm leading-relaxed text-white/55">
        Every slide is decided live by NVIDIA Nemotron on Nebius Token Factory. Tavily finds the facts and names the memes.
      </p>
      <p className="text-xs text-white/40">
        Built from scratch at the{" "}
        <a href={HACKATHON_URL} target="_blank" rel="noopener" className="font-semibold text-white/70 underline-offset-4 outline-none hover:text-[#ffd60a] hover:underline focus-visible:text-white">
          Nebius × NVIDIA Global AI Hackathon
        </a>
        , Stockholm, October 2026.
      </p>
    </section>
  );
}
