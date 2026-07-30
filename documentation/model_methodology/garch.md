# GARCH(1,1)

Conditional volatility that clusters and mean-reverts:
`sigma_t^2 = omega + alpha*eps_{t-1}^2 + beta*sigma_{t-1}^2`, with a constant
mean and Gaussian innovations.

**Calibration**: fit directly on decimal-scale simple returns via
`arch.arch_model(..., mean="Constant", vol="GARCH", p=1, q=1, dist="normal",
rescale=False)`. `rescale=False` is passed explicitly so `arch` never
silently re-scales the reported coefficients — the fitted `mu`/`omega` are
guaranteed to be in the same units as the input returns. The last in-sample
conditional variance and residual are also stored, seeding the forward
simulation from the model's actual last-known volatility state rather than
resetting to the unconditional long-run variance.

**Simulation**: the variance recursion is iterated forward day-by-day
(`sigma_t^2` depends on the previous step's simulated residual), generating
one path per step — this is what produces the volatility clustering visible
in simulated paths (verified in tests via positive lag-1 autocorrelation of
squared simulated returns).
