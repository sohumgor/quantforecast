/** Purely decorative — a faint fading grid plus three slow-drifting gradient
 * blobs behind the landing hero. Zero JavaScript: everything here is CSS
 * (transform/opacity only, GPU-friendly) so it costs nothing on the wire and
 * nothing on the main thread. Motion is skipped outright for
 * prefers-reduced-motion via the `motion-safe:` variant. */
export function HeroBackground() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="bg-grid-fade absolute inset-0 opacity-[0.5] dark:opacity-[0.2]" />
      <div
        className="absolute -top-28 left-[-8%] h-[26rem] w-[26rem] rounded-full opacity-[0.16] blur-3xl motion-safe:animate-[blob-drift-1_22s_ease-in-out_infinite] dark:opacity-[0.14]"
        style={{ background: "radial-gradient(circle at 30% 30%, var(--series-1), transparent 70%)" }}
      />
      <div
        className="absolute top-6 right-[-10%] h-[22rem] w-[22rem] rounded-full opacity-[0.14] blur-3xl motion-safe:animate-[blob-drift-2_26s_ease-in-out_infinite] dark:opacity-[0.12]"
        style={{ background: "radial-gradient(circle at 60% 40%, var(--series-3), transparent 70%)" }}
      />
      <div
        className="absolute bottom-[-15rem] left-1/3 h-[24rem] w-[24rem] rounded-full opacity-[0.12] blur-3xl motion-safe:animate-[blob-drift-3_30s_ease-in-out_infinite] dark:opacity-[0.1]"
        style={{ background: "radial-gradient(circle at 50% 50%, var(--series-7), transparent 70%)" }}
      />
    </div>
  );
}
