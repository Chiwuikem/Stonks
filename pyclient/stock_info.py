import yfinance as yf

def main():
    ticker = input("Enter ticker (e.g., AAPL): ").strip().upper()
    if not ticker:
        print("No ticker entered."); return

    t = yf.Ticker(ticker)
    # Last 2 daily bars gives us "latest" and "previous close"
    hist = t.history(period="5d", interval="1d").dropna()

    if hist.empty:
        print("No data returned for that ticker."); return

    last_close = hist["Close"].iloc[-1]
    prev_close = hist["Close"].iloc[-2] if len(hist) > 1 else None

    print(f"\n=== {ticker} ===")
    print(f"Price (last close): {last_close:.2f}")
    if prev_close is not None:
        print(f"Prev Close:         {prev_close:.2f}")
        change_pct = (last_close - prev_close) / prev_close * 100
        print(f"Day Change %:       {change_pct:.2f}%")

if __name__ == "__main__":
    main()
