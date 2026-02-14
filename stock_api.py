from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import yfinance as yf
from datetime import datetime, timedelta


app = FastAPI()

# Allow local frontend to talk to this API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # fine for local dev
    allow_methods=["*"],
    allow_headers=["*"],
)


class Candle(BaseModel):
    time: int  # unix timestamp (seconds)
    open: float
    high: float
    low: float
    close: float
    volume: float | None = None


class DailyResponse(BaseModel):
    ticker: str
    candles: list[Candle]


# Mapping of timeframe to yfinance interval and period
TIMEFRAME_MAP = {
    "1m": {"interval": "1m", "period": "7d"},  # max 7 days for 1m
    "5m": {"interval": "5m", "period": "60d"},  # max 60 days for 5m
    "15m": {"interval": "15m", "period": "60d"},
    "30m": {"interval": "30m", "period": "60d"},
    "1h": {"interval": "1h", "period": "730d"},  # max 2 years
    "4h": {"interval": "1h", "period": "730d"},  # we'll aggregate from 1h
    "1d": {"interval": "1d", "period": "max"},
    "1wk": {"interval": "1wk", "period": "max"},
}


def aggregate_to_4h(hourly_data):
    """Aggregate 1h candles into 4h candles"""
    if hourly_data.empty:
        return hourly_data

    # Group by 4-hour windows
    aggregated = []
    i = 0
    while i < len(hourly_data):
        chunk = hourly_data.iloc[i : i + 4]
        if len(chunk) == 0:
            break

        candle = {
            "Open": chunk.iloc[0]["Open"],
            "High": chunk["High"].max(),
            "Low": chunk["Low"].min(),
            "Close": chunk.iloc[-1]["Close"],
            "Volume": chunk["Volume"].sum(),
        }
        # Use the timestamp of the first candle in the chunk
        aggregated.append((chunk.index[0], candle))
        i += 4

    # Convert back to DataFrame
    import pandas as pd

    if not aggregated:
        return hourly_data.head(0)

    indices, data = zip(*aggregated)
    df = pd.DataFrame(list(data), index=list(indices))
    return df


@app.get("/api/candles/{ticker}", response_model=DailyResponse)
def get_candles(
    ticker: str,
    timeframe: str = Query("1d", description="Timeframe: 1m, 5m, 15m, 30m, 1h, 4h, 1d, 1wk"),
    count: int = Query(1000, description="Number of candles to return"),
):
    """
    Return up to `count` candles for the given ticker and timeframe.
    """
    ticker = ticker.upper().strip()
    if not ticker:
        raise HTTPException(status_code=400, detail="Ticker is required")

    if timeframe not in TIMEFRAME_MAP:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid timeframe. Must be one of: {', '.join(TIMEFRAME_MAP.keys())}",
        )

    tf_config = TIMEFRAME_MAP[timeframe]

    try:
        t = yf.Ticker(ticker)

        # For 4h, we fetch 1h and aggregate
        if timeframe == "4h":
            hist = t.history(period=tf_config["period"], interval=tf_config["interval"])
            hist = hist.dropna()
            hist = aggregate_to_4h(hist)
        else:
            hist = t.history(period=tf_config["period"], interval=tf_config["interval"])
            hist = hist.dropna()

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching data: {e}")

    if hist.empty:
        raise HTTPException(status_code=404, detail="No data for ticker")

    # Limit to requested count (most recent candles)
    if len(hist) > count:
        hist = hist.tail(count)

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
                volume=float(row["Volume"]) if "Volume" in row else None,
            )
        )

    return DailyResponse(ticker=ticker, candles=candles)