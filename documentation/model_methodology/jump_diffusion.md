# Merton Jump Diffusion

Merton (1976): GBM plus a compound Poisson jump process, capturing sudden
large moves that pure diffusion models underweight.

**Calibration**: a standard threshold-filtering approach. Log returns more
than `jump_threshold_std` (default 3.0) sample standard deviations from the
mean are classified as jumps; `mu`/`sigma` are estimated from the remaining
"normal" returns (same annualization as GBM), and the jump parameters
(`jump_intensity`, `jump_mean`, `jump_std`) from the filtered-out jump
returns. This is simpler than full MLE/EM estimation and is a widely-used
practical technique, but it under-detects mild jumps that don't clear the
threshold — jump intensity should be read as a lower bound, not an exact count.

**Simulation**: each day draws `n_jumps ~ Poisson(jump_intensity * dt)`; since
a sum of `n` i.i.d. `Normal(jump_mean, jump_std^2)` draws is exactly
`Normal(n*jump_mean, n*jump_std^2)`, the total jump contribution for the day
is sampled directly in closed form (no inner loop over jump counts) and added
to the ordinary GBM log-return increment.
