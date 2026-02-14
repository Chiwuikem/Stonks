import { useState } from "react";
import type { FormEvent } from "react";
import "./App.css";
import CandleChart from "./CandleChart";
import type { Candle } from "./CandleChart";
import { type UTCTimestamp } from "lightweight-charts";

// initial sample candles (shown before first real fetch)
const sampleDailyCandles: Candle[] = [
  { time: 1704067200 as UTCTimestamp, open: 185, high: 188, low: 183, close: 187, volume: 50000000 },
  { time: 1704153600 as UTCTimestamp, open: 187, high: 189, low: 185, close: 186, volume: 48000000 },
  { time: 1704240000 as UTCTimestamp, open: 186, high: 190, low: 186, close: 189, volume: 52000000 },
  { time: 1704326400 as UTCTimestamp, open: 189, high: 191, low: 187, close: 188, volume: 49000000 },
  { time: 1704412800 as UTCTimestamp, open: 188, high: 193, low: 188, close: 192, volume: 55000000 },
  { time: 1704672000 as UTCTimestamp, open: 192, high: 194, low: 190, close: 191, volume: 51000000 },
  { time: 1704758400 as UTCTimestamp, open: 191, high: 195, low: 191, close: 194, volume: 53000000 },
];

type ApiCandle = {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
};

type DailyResponse = {
  ticker: string;
  candles: ApiCandle[];
};

export type IndicatorType = "volume" | "macd" | "rsi" | "sma" | "ema" | "vwap";

export type Indicator = {
  id: string;
  type: IndicatorType;
  period?: number;
  color?: string;
};

const TIMEFRAMES = [
  { value: "1m", label: "1m" },
  { value: "5m", label: "5m" },
  { value: "15m", label: "15m" },
  { value: "30m", label: "30m" },
  { value: "1h", label: "1H" },
  { value: "4h", label: "4H" },
  { value: "1d", label: "1D" },
  { value: "1wk", label: "1W" },
];

export default function App() {
  const [tickerInput, setTickerInput] = useState("AAPL");
  const [activeTicker, setActiveTicker] = useState("AAPL");
  const [timeframe, setTimeframe] = useState("1d");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [candles, setCandles] = useState<Candle[]>(sampleDailyCandles);
  const [indicators, setIndicators] = useState<Indicator[]>([]);
  const [shouldFitContent, setShouldFitContent] = useState(false);

  const fetchCandles = async (ticker: string, tf: string) => {
    setError(null);
    setIsLoading(true);

    try {
      const res = await fetch(
        `http://localhost:8000/api/candles/${ticker}?timeframe=${tf}&count=1000`
      );

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
        volume: c.volume,
      }));

      if (mapped.length === 0) {
        throw new Error("No candles returned for ticker");
      }

      setCandles(mapped);
      setActiveTicker(data.ticker);
      setShouldFitContent(true); // Trigger fit content after new data loads
      setTimeout(() => setShouldFitContent(false), 100); // Reset after fit
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Unexpected error fetching data";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

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

    await fetchCandles(ticker, timeframe);
  };

  const handleTimeframeChange = async (newTf: string) => {
    setTimeframe(newTf);
    if (activeTicker) {
      await fetchCandles(activeTicker, newTf);
    }
  };

  const addIndicator = (type: IndicatorType, period?: number) => {
    const id = `${type}-${Date.now()}-${Math.random()}`;
    const newIndicator: Indicator = { id, type, period };
    setIndicators([...indicators, newIndicator]);
  };

  const removeIndicator = (id: string) => {
    setIndicators(indicators.filter((ind) => ind.id !== id));
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
      <div
        style={{
          maxWidth: "1400px",
          margin: "0 auto",
          padding: "24px",
        }}
      >
        <h1 style={{ marginBottom: 16, fontSize: "2.5rem", fontWeight: 700 }}>
          STONKS Charts
        </h1>

        <form
          onSubmit={handleSubmit}
          style={{ marginBottom: 16, display: "flex", gap: 8, flexWrap: "wrap" }}
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
            {isLoading ? "Loading…" : "Load Chart"}
          </button>
        </form>

        {/* Timeframe selector */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {TIMEFRAMES.map((tf) => (
              <button
                key={tf.value}
                onClick={() => handleTimeframeChange(tf.value)}
                disabled={isLoading}
                style={{
                  padding: "6px 14px",
                  borderRadius: 6,
                  border: "1px solid #4b5563",
                  backgroundColor:
                    timeframe === tf.value ? "#2563eb" : "#111827",
                  color: timeframe === tf.value ? "white" : "#e5e7eb",
                  fontWeight: timeframe === tf.value ? 600 : 400,
                  cursor: isLoading ? "default" : "pointer",
                  opacity: isLoading ? 0.6 : 1,
                }}
              >
                {tf.label}
              </button>
            ))}
          </div>
        </div>

        {isLoading && (
          <p style={{ marginBottom: 8, color: "#93c5fd" }}>Loading chart…</p>
        )}

        {error && (
          <p style={{ marginBottom: 8, color: "#f87171" }}>{error}</p>
        )}

        {!isLoading && !error && (
          <h2 style={{ marginBottom: 8, fontSize: "1.25rem", fontWeight: 600 }}>
            {activeTicker} –{" "}
            {TIMEFRAMES.find((tf) => tf.value === timeframe)?.label}
          </h2>
        )}
      </div>

      <div style={{ maxWidth: "1400px", margin: "0 auto", padding: "0 24px" }}>
        <div style={{ display: "flex", gap: 24 }}>
          {/* Chart */}
          <div style={{ flex: 1 }}>
            <CandleChart
              candles={candles}
              indicators={indicators}
              shouldFitContent={shouldFitContent}
              onIndicatorColorAssigned={(id, color) => {
                setIndicators((prev) =>
                  prev.map((ind) =>
                    ind.id === id ? { ...ind, color } : ind
                  )
                );
              }}
            />
          </div>

          {/* Indicator panel */}
          <div style={{ width: 220 }}>
            <IndicatorPanel
              indicators={indicators}
              onAddIndicator={addIndicator}
              onRemoveIndicator={removeIndicator}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

type IndicatorPanelProps = {
  indicators: Indicator[];
  onAddIndicator: (type: IndicatorType, period?: number) => void;
  onRemoveIndicator: (id: string) => void;
};

function IndicatorPanel({
  indicators,
  onAddIndicator,
  onRemoveIndicator,
}: IndicatorPanelProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [showPeriodInput, setShowPeriodInput] = useState<IndicatorType | null>(
    null
  );
  const [periodValue, setPeriodValue] = useState("14");

  const handleAddClick = (type: IndicatorType) => {
    if (type === "sma" || type === "ema") {
      setShowPeriodInput(type);
      setShowMenu(false);
    } else {
      onAddIndicator(type);
      setShowMenu(false);
    }
  };

  const handlePeriodSubmit = () => {
    if (showPeriodInput) {
      const period = parseInt(periodValue, 10);
      if (period > 0) {
        onAddIndicator(showPeriodInput, period);
      }
      setShowPeriodInput(null);
      setPeriodValue("14");
    }
  };

  const getIndicatorLabel = (ind: Indicator) => {
    const base = ind.type.toUpperCase();
    if (ind.period) return `${base}(${ind.period})`;
    return base;
  };

  return (
    <div
      style={{
        backgroundColor: "#111827",
        border: "1px solid #1f2937",
        borderRadius: 8,
        padding: 12,
      }}
    >
      <h3
        style={{
          fontSize: "0.9rem",
          fontWeight: 600,
          marginBottom: 12,
          color: "#cbd5e1",
        }}
      >
        Indicators
      </h3>

      {/* List of added indicators */}
      <div style={{ marginBottom: 12 }}>
        {indicators.map((ind) => (
          <div
            key={ind.id}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "6px 8px",
              marginBottom: 6,
              backgroundColor: "#1f2937",
              borderRadius: 6,
              fontSize: "0.85rem",
            }}
          >
            <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
              {ind.color && (
                <span
                  style={{
                    display: "inline-block",
                    width: 12,
                    height: 12,
                    borderRadius: "50%",
                    backgroundColor: ind.color,
                  }}
                />
              )}
              {getIndicatorLabel(ind)}
            </span>
            <button
              onClick={() => onRemoveIndicator(ind.id)}
              style={{
                background: "none",
                border: "none",
                color: "#f87171",
                cursor: "pointer",
                fontSize: "1rem",
                padding: 0,
                lineHeight: 1,
              }}
            >
              ×
            </button>
          </div>
        ))}
      </div>

      {/* Period input dialog */}
      {showPeriodInput && (
        <div
          style={{
            marginBottom: 12,
            padding: 8,
            backgroundColor: "#1f2937",
            borderRadius: 6,
          }}
        >
          <div style={{ fontSize: "0.85rem", marginBottom: 6 }}>
            Enter period for {showPeriodInput.toUpperCase()}:
          </div>
          <div style={{ display: "flex", gap: 4 }}>
            <input
              type="number"
              value={periodValue}
              onChange={(e) => setPeriodValue(e.target.value)}
              style={{
                flex: 1,
                padding: "4px 6px",
                borderRadius: 4,
                border: "1px solid #4b5563",
                backgroundColor: "#111827",
                color: "#e5e7eb",
                fontSize: "0.85rem",
              }}
              min="1"
            />
            <button
              onClick={handlePeriodSubmit}
              style={{
                padding: "4px 8px",
                borderRadius: 4,
                border: "none",
                backgroundColor: "#2563eb",
                color: "white",
                fontSize: "0.75rem",
                cursor: "pointer",
              }}
            >
              Add
            </button>
            <button
              onClick={() => {
                setShowPeriodInput(null);
                setPeriodValue("14");
              }}
              style={{
                padding: "4px 8px",
                borderRadius: 4,
                border: "1px solid #4b5563",
                backgroundColor: "#111827",
                color: "#e5e7eb",
                fontSize: "0.75rem",
                cursor: "pointer",
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Add indicator button */}
      {!showPeriodInput && (
        <div style={{ position: "relative" }}>
          <button
            onClick={() => setShowMenu(!showMenu)}
            style={{
              width: "100%",
              padding: "8px 12px",
              borderRadius: 6,
              border: "1px solid #4b5563",
              backgroundColor: "#1f2937",
              color: "#e5e7eb",
              fontSize: "0.85rem",
              cursor: "pointer",
              textAlign: "left",
            }}
          >
            + Add Indicator
          </button>

          {showMenu && (
            <div
              style={{
                position: "absolute",
                top: "100%",
                left: 0,
                right: 0,
                marginTop: 4,
                backgroundColor: "#1f2937",
                border: "1px solid #4b5563",
                borderRadius: 6,
                overflow: "hidden",
                zIndex: 10,
              }}
            >
              {[
                { type: "volume" as IndicatorType, label: "Volume" },
                { type: "macd" as IndicatorType, label: "MACD" },
                { type: "rsi" as IndicatorType, label: "RSI" },
                { type: "sma" as IndicatorType, label: "SMA" },
                { type: "ema" as IndicatorType, label: "EMA" },
                { type: "vwap" as IndicatorType, label: "VWAP" },
              ].map((item) => (
                <button
                  key={item.type}
                  onClick={() => handleAddClick(item.type)}
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    border: "none",
                    backgroundColor: "transparent",
                    color: "#e5e7eb",
                    fontSize: "0.85rem",
                    textAlign: "left",
                    cursor: "pointer",
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.backgroundColor = "#374151")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.backgroundColor = "transparent")
                  }
                >
                  {item.label}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}