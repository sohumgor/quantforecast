# Historical Bootstrap

Resamples actual historical returns directly, making no parametric
distributional assumption — whatever the empirical return distribution
looked like (fat tails, skew, etc.) is exactly what gets resampled.

**Calibration**: stores the full historical (simple) returns pool; no fitted
parameters in the usual sense.

**Simulation**: with `block_size=1` (default), each simulated day draws one
return uniformly at random, with replacement, from the historical pool
(classic i.i.d. bootstrap). With `block_size > 1`, contiguous blocks of that
length are resampled instead (a moving-block bootstrap) — this better
preserves short-term serial dependence (volatility clustering,
autocorrelation) than plain i.i.d. resampling, at the cost of a coarser
sampling grid. Every simulated return is, by construction, a value that
actually occurred historically — there is no synthesized/extrapolated tail
behavior beyond what's in the sample.
