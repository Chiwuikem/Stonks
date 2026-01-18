from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import yfinance as yf


app = FastAPI()

# Allow local frontend to talk to this API (even before we add a proxy)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # fine for local dev; we can tighten later
    allow_methods=["*"],
    allow_headers=["*"],
)


class Candle(BaseModel):
    time: int   # unix timestamp (seconds)
    open: float
    high: float
    low: float
    close: float


class DailyResponse(BaseModel):
    ticker: str
    candles: list[Candle]


@app.get("/api/daily/{ticker}", response_model=DailyResponse)
def get_daily_candles(ticker: str, days: int = 90):
    """
    Return up to `days` daily OHLC candles for the given ticker.
    """
    ticker = ticker.upper().strip()
    if not ticker:
        raise HTTPException(status_code=400, detail="Ticker is required")

    try:
        t = yf.Ticker(ticker)
        hist = t.history(period=f"{days}d", interval="1d").dropna()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching data: {e}")

    if hist.empty:
        raise HTTPException(status_code=404, detail="No data for ticker")

    candles: list[Candle] = []

    for idx, row in hist.iterrows():
        ts = int(idx.timestamp())  # convert pandas Timestamp -> unix seconds
        candles.append(
            Candle(
                time=ts,
                open=float(row["Open"]),
                high=float(row["High"]),
                low=float(row["Low"]),
                close=float(row["Close"]),
            )
        )

    return DailyResponse(ticker=ticker, candles=candles)
