import yfinance as yf

def main():
    ticker = input("Enter ticker (e.g., AAPL): ").strip().upper()
    if not ticker:
        print("No ticker entered."); return

    t = yf.Ticker(ticker)
    # fetch enough to get: prior day + last 5 trading days
    hist = t.history(period="12d", interval="1d").dropna()

    if len(hist) < 5:
        print("Not enough recent data for 5 trading days."); return

    last5 = hist.tail(5)
    start = float(last5["Close"].iloc[0])
    end   = float(last5["Close"].iloc[-1])
    net_change_pct = (end - start) / start * 100

    # gap detection: compare first day of the 5-day window to the day before it (if available)
    prior_close = float(hist["Close"].iloc[-6]) if len(hist) >= 6 else None
    gap_pct = ((start - prior_close) / prior_close * 100) if prior_close else 0.0
    is_gap = prior_close is not None and abs(gap_pct) >= 3.0  # ≥3% gap qualifies

    # consolidation detection: narrow band + small net move
    cmax = float(last5["Close"].max())
    cmin = float(last5["Close"].min())
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

    print(f"\n=== {ticker} — Past 5 Trading Days ===")
    print(f"Start Close:        {start:.2f}")
    print(f"End Close:          {end:.2f}")
    print(f"Net Change %:       {net_change_pct:.2f}%")
    if prior_close:
        print(f"Gap vs prior %:     {gap_pct:.2f}%")
    print(f"5D Range Width %:   {band_width_pct:.2f}%")
    print(f"Trend:              {trend}")

if __name__ == "__main__":
    main()
