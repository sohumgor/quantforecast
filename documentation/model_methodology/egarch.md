# EGARCH

Nelson (1991) exponential GARCH. Models *log*-variance, so it captures
asymmetric volatility response to positive vs. negative shocks (the leverage
effect) without needing to constrain parameters to keep variance positive:

```
ln(sigma_t^2) = omega + alpha*(|e_{t-1}| - E|e_{t-1}|) + gamma*e_{t-1} + beta*ln(sigma_{t-1}^2)
```

where `e_t = eps_t / sigma_t` is the standardized residual and
`E|e_t| = sqrt(2/pi)` for a standard normal. `alpha` scales the symmetric
magnitude response; `gamma` (typically negative for equities) is the
asymmetry/leverage term — negative shocks (`e_{t-1} < 0`) push `gamma*e_{t-1}`
positive, raising next-period volatility more than an equally-sized positive
shock would.

**Calibration**: `arch.arch_model(..., mean="Constant", vol="EGARCH", p=1,
o=1, q=1, dist="normal", rescale=False)`, fit directly on decimal-scale
returns (same rescale-safety rationale as GARCH). Last in-sample conditional
variance/residual seed the forward simulation.

**Simulation**: forward-iterates the log-variance recursion day-by-day, using
each step's own standardized shock as the next step's asymmetry input.
