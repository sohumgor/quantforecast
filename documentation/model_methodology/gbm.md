# Geometric Brownian Motion

Constant-drift, constant-volatility log-normal diffusion: `dS = mu*S*dt + sigma*S*dW`.
The textbook baseline forecasting model.

**Calibration**: closed-form MLE from simple returns. Log returns
`r_t = ln(S_t/S_{t-1})` are approximately `N((mu - 0.5*sigma^2)*dt, sigma^2*dt)`,
so `sigma` is the annualized sample standard deviation of log returns, and
`mu` (the SDE's drift — the total annualized expected return rate) backs out
from the annualized sample mean plus the variance drag term `0.5*sigma^2`.

**Simulation**: exact discretization,
`S_{t+dt} = S_t * exp((mu - 0.5*sigma^2)*dt + sigma*sqrt(dt)*Z)`, `Z ~ N(0,1)`.

**Caveat worth surfacing to users**: `sigma` converges quickly with modest
history, but `mu` is notoriously hard to estimate from price history alone —
its standard error only shrinks with `sigma/sqrt(years of data)`, so even a
decade of daily prices leaves substantial drift uncertainty. This is a
fundamental statistical limitation of drift estimation, not specific to this
implementation.
