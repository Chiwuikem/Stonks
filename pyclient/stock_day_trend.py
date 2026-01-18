import yfinance as yf
import numpy as np

def main():
    ticker = input("Enter ticker (e.g., AAPL): ").strip().upper()
    if not ticker:
        print("No ticker entered."); return
    
    try:
        n_days = int(input("Enter number of trading days (e.g., 5, 10, 20): ").strip())
    except ValueError:
        print("Invalid number of days."); return
    if n_days < 2:
        print("Please enter at least 2 days."); return
    
    # fetch enough calendar days to cover n_days of trading (buffer for weekends/holidays + 2 for prior day)
    lookback_days = n_days + 7
    t = yf.Ticker(ticker)
    hist = t.history(period=f"{lookback_days}d", interval="1d").dropna()

    if len(hist) < n_days:
        print(f"Not enough recent data for {n_days} trading days."); return

    lastN = hist.tail(n_days)
    first_open = float(lastN["Open"].iloc[0])
    start = float(lastN["Close"].iloc[0])
    end   = float(lastN["Close"].iloc[-1])
    net_change_pct = (end - start) / start * 100.0

    # --- Gap detection ---
    prior_close = float(hist["Close"].iloc[-(n_days + 1)]) if len(hist) >= (n_days + 1) else None
    gap_pct = ((first_open - prior_close) / prior_close * 100.0) if prior_close else 0.0
    is_gap = prior_close is not None and abs(gap_pct) >= 3.0  # ≥3% gap qualifies

    # --- Range width using High/Low ---
    hi = float(lastN["High"].max())
    lo = float(lastN["Low"].min())
    mid = (hi + lo) / 2.0
    band_width_pct = ((hi - lo) / mid * 100.0) if mid != 0 else 0.0

    # --- Efficiency: how much of the movement became progress? ---
    efficiency = (abs(net_change_pct) / band_width_pct) if band_width_pct > 0 else 0.0

    # --- Trendline (slope + R^2 of closes) - DESCRIPTIVE ONLY ---
    closes = lastN["Close"].astype(float).values
    x = np.arange(len(closes), dtype=float)

    # linear fit: close = m*x + b
    m, b = np.polyfit(x, closes, 1)

    # Convert slope to % per day using average close as scale
    avg_close = float(np.mean(closes)) if len(closes) else 0.0
    slope_pct_per_day = (m / avg_close * 100.0) if avg_close != 0 else 0.0

    # R^2 (how well a line explains the series)
    y_pred = m * x + b
    ss_res = float(np.sum((closes - y_pred) ** 2))
    ss_tot = float(np.sum((closes - np.mean(closes)) ** 2))
    r2 = 1.0 - (ss_res / ss_tot) if ss_tot != 0 else 0.0

    # --- Volatility: std dev of daily % returns ---
    if len(closes) > 1:
        daily_returns = (closes[1:] / closes[:-1] - 1.0) * 100.0  # in %
        std_pct = float(np.std(daily_returns, ddof=1))            # sample std dev
    else:
        std_pct = 0.0

    # --- Dynamic thresholds (scale with window length) ---
    # Wider windows naturally have wider ranges, so allow more band width.
    band_cap = 4.0 + 0.25 * max(0, n_days - 5)     # 5d->4%, 30d->~10.25%
    band_cap = min(band_cap, 18.0)                 # keep sane

    # Net change should scale a bit with days before calling it a trend
    min_net_for_trend = max(3.0, 0.12 * n_days)    # 30d->3.6%

    # --- Trend classification (NO R^2 here) ---
    # Consolidation: tight range, low efficiency, small net move
    is_consolidation = (
        band_width_pct <= band_cap and
        efficiency <= 0.40 and
        abs(net_change_pct) < min_net_for_trend
    )

    # Up / Down: enough net move + decent efficiency
    is_trend_up = (net_change_pct >= min_net_for_trend and efficiency >= 0.45)
    is_trend_dn = (net_change_pct <= -min_net_for_trend and efficiency >= 0.45)

    # --- Final trend label ---
    if is_gap and is_consolidation:
        trend = "Consolidation after gap"
    elif is_consolidation:
        trend = "Consolidation"
    elif is_trend_up:
        trend = "Uptrend"
    elif is_trend_dn:
        trend = "Downtrend"
    else:
        trend = "Sideways"

    # --- R^2 + Std interpretation (4 combinations) ---
    # thresholds for "high" vs "low"
    r2_high_cut = 0.55
    std_high_cut = 1.5  # 1.5% daily std dev ~ fairly volatile

    is_high_r2 = (r2 >= r2_high_cut)
    is_high_std = (std_pct >= std_high_cut)

    if is_high_std and is_high_r2:
        structure = "Strong, volatile trend (high volatility + good trendline fit)"
    elif is_high_std and not is_high_r2:
        structure = "Chaotic / whipsaw (high volatility, poor trendline fit)"
    elif not is_high_std and is_high_r2:
        structure = "Smooth, steady trend (low volatility + good trendline fit)"
    else:
        structure = "Quiet consolidation / drift (low volatility + poor trendline fit)"

    # --- Output ---
    print(f"\n=== {ticker} — Past {n_days} Trading Days ===")
    print(f"Start Close:        {start:.2f}")
    print(f"End Close:          {end:.2f}")
    print(f"Net Change %:       {net_change_pct:.2f}%")
    if prior_close:
        print(f"Gap vs prior %:     {gap_pct:.2f}%")
    print(f"Range Width %:      {band_width_pct:.2f}% (High/Low over {n_days}D)")
    print(f"Efficiency:         {efficiency*100:.1f}%")
    print(f"Slope %/day:        {slope_pct_per_day:.3f}%")
    print(f"R^2 (fit quality):  {r2:.2f}")
    print(f"Daily Vol Std %:    {std_pct:.2f}%")
    print(f"Trend:              {trend}")
    print(f"Structure:          {structure}")

if __name__ == "__main__":
    main()
