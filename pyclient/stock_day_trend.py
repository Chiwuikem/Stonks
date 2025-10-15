import yfinance as yf

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
        print("Not enough recent data for 5 trading days."); return

    lastN = hist.tail(n_days)
    start = float(lastN["Close"].iloc[0])
    end   = float(lastN["Close"].iloc[-1])
    net_change_pct = (end - start) / start * 100

    first_open = lastN["Open"].iloc[0]



    # gap detection: compare first day of the 5-day window to the day before it (if available)
    prior_close = float(hist["Close"].iloc[-(n_days+1)]) if len(hist) >= (n_days+1) else None
    gap_pct = ((first_open - prior_close) / prior_close * 100) if prior_close else 0.0
    is_gap = prior_close is not None and abs(gap_pct) >= 3.0  # ≥3% gap qualifies

    # consolidation detection: narrow band + small net move
    cmax = float(lastN["Close"].max())
    cmin = float(lastN["Close"].min())
    band_width_pct = (cmax - cmin) / ((cmax + cmin) / 2.0) * 100  # % width vs mid-price

    # Simple, ordered rules:
    # 1) Consolidation after a gap: big gap into a tight 5-day range with small net change
    if is_gap and band_width_pct <= 6.0 and abs(net_change_pct) <= 3.0:
        trend = "Consolidation after gap"
    # 2) Consolidation (no strong gap): tight 5-day range + small net change
    elif band_width_pct <= 4.0 and abs(net_change_pct) <= 2.0:
        trend = "Consolidation"
    # 3) Otherwise directional by net change
    elif net_change_pct >= 2.0:
        trend = "Uptrend"
    elif net_change_pct <= -2.0:
        trend = "Downtrend"
    else:
        trend = "Sideways"

    print(f"\n=== {ticker} — Past {n_days} Trading Days ===")
    print(f"Start Close:        {start:.2f}")
    print(f"End Close:          {end:.2f}")
    print(f"Net Change %:       {net_change_pct:.2f}%")
    if prior_close:
        print(f"Gap vs prior %:     {gap_pct:.2f}%")
    print(f"5D Range Width %:   {band_width_pct:.2f}%")
    print(f"Trend:              {trend}")

if __name__ == "__main__":
    main()
