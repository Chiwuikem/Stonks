import { useState } from "react";
import type { FormEvent } from "react";
import "./App.css";
import CandleChart from "./CandleChart";
import type { Candle } from "./CandleChart";
import { type UTCTimestamp } from "lightweight-charts";

// initial sample candles (shown before first real fetch)
const sampleDailyCandles: Candle[] = [
  { time: 1704067200 as UTCTimestamp, open: 185, high: 188, low: 183, close: 187 }, // 2024-01-01
  { time: 1704153600 as UTCTimestamp, open: 187, high: 189, low: 185, close: 186 }, // 2024-01-02
  { time: 1704240000 as UTCTimestamp, open: 186, high: 190, low: 186, close: 189 }, // 2024-01-03
  { time: 1704326400 as UTCTimestamp, open: 189, high: 191, low: 187, close: 188 }, // 2024-01-04
  { time: 1704412800 as UTCTimestamp, open: 188, high: 193, low: 188, close: 192 }, // 2024-01-05
  { time: 1704672000 as UTCTimestamp, open: 192, high: 194, low: 190, close: 191 }, // 2024-01-08
  { time: 1704758400 as UTCTimestamp, open: 191, high: 195, low: 191, close: 194 }, // 2024-01-09
];

type ApiCandle = {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
};

type DailyResponse = {
  ticker: string;
  candles: ApiCandle[];
};

export default function App() {
  // ticker input and active ticker label
  const [tickerInput, setTickerInput] = useState("AAPL");
  const [activeTicker, setActiveTicker] = useState("AAPL");

  // loading + error state
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // candles currently shown on the chart
  const [candles, setCandles] = useState<Candle[]>(sampleDailyCandles);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    const ticker = tickerInput.trim().toUpperCase();

    if (!ticker) {
      setError("Please enter a ticker");
      return;
    }

    if (!/^[A-Z]{1,5}$/.test(ticker)) {
      setError("Invalid ticker symbol");
      return;
    }

    setError(null);
    setIsLoading(true);

    try {
      const res = await fetch(`http://localhost:8000/api/daily/${ticker}`);

      if (!res.ok) {
        const errBody = await res.json().catch(() => null);
        const serverMsg =
          errBody && typeof errBody.detail === "string"
            ? errBody.detail
            : "Failed to load data";
        throw new Error(serverMsg);
      }

      const data: DailyResponse = await res.json();

      const mapped: Candle[] = data.candles.map((c) => ({
        time: c.time as UTCTimestamp,
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close,
      }));

      if (mapped.length === 0) {
        throw new Error("No candles returned for ticker");
      }

      setCandles(mapped);
      setActiveTicker(data.ticker);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Unexpected error fetching data";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      style={{
        width: "100vw",
        minHeight: "100vh",
        color: "#f9fafb",
        backgroundColor: "#0b0f19",
      }}
    >
      {/* Header + controls (centered, not full width) */}
      <div
        style={{
          maxWidth: "1200px",
          margin: "0 auto",
          padding: "24px",
        }}
      >
        <h1 style={{ marginBottom: 16, fontSize: "2.5rem", fontWeight: 700 }}>
          STONKS Charts
        </h1>

        <form
          onSubmit={handleSubmit}
          style={{ marginBottom: 16, display: "flex", gap: 8 }}
        >
          <input
            value={tickerInput}
            onChange={(e) => setTickerInput(e.target.value)}
            placeholder="Enter ticker (e.g., AAPL)"
            style={{
              padding: "8px 12px",
              borderRadius: 8,
              border: "1px solid #4b5563",
              backgroundColor: "#111827",
              color: "#e5e7eb",
              outline: "none",
              width: 260,
            }}
          />
          <button
            type="submit"
            disabled={isLoading}
            style={{
              padding: "8px 16px",
              borderRadius: 8,
              border: "none",
              backgroundColor: isLoading ? "#1d4ed8" : "#2563eb",
              opacity: isLoading ? 0.7 : 1,
              color: "white",
              fontWeight: 600,
              cursor: isLoading ? "default" : "pointer",
            }}
          >
            {isLoading ? "Loading…" : "Load Daily Chart"}
          </button>
        </form>

        {isLoading && (
          <p style={{ marginBottom: 8, color: "#93c5fd" }}>Loading chart…</p>
        )}

        {error && (
          <p style={{ marginBottom: 8, color: "#f87171" }}>{error}</p>
        )}

        {!isLoading && !error && (
          <h2 style={{ marginBottom: 8, fontSize: "1.25rem", fontWeight: 600 }}>
            {activeTicker} – Daily
          </h2>
        )}
      </div>

      {/* Chart area (full width) */}
      <div style={{ width: "70vw", padding: "0 12px 24px" }}>
        <CandleChart candles={candles} />
      </div>
    </div>
  );
}
