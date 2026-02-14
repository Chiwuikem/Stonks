import { useEffect, useRef, useState } from "react";
import {
  createChart,
  type UTCTimestamp,
  type IChartApi,
  type ISeriesApi,
  type MouseEventParams,
} from "lightweight-charts";
import type { Indicator } from "./App";

export type Candle = {
  time: UTCTimestamp;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
};

type CandleChartProps = {
  candles: Candle[];
  indicators: Indicator[];
  onIndicatorColorAssigned: (id: string, color: string) => void;
  shouldFitContent?: boolean; // Optional prop to trigger fitContent
};

const CHART_COLORS = [
  "#3b82f6", // blue
  "#f59e0b", // amber
  "#8b5cf6", // purple
  "#ec4899", // pink
  "#14b8a6", // teal
  "#f97316", // orange
  "#06b6d4", // cyan
  "#a855f7", // violet
  "#84cc16", // lime
  "#ef4444", // red
];

export default function CandleChart({
  candles,
  indicators,
  onIndicatorColorAssigned,
  shouldFitContent = false,
}: CandleChartProps) {
  const mainContainerRef = useRef<HTMLDivElement | null>(null);
  const mainChartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);

  const [hoverData, setHoverData] = useState<{
    time: string;
    open: number;
    high: number;
    low: number;
    close: number;
    volume?: number;
    percentChange: number;
  } | null>(null);

  // Refs for indicator charts and series
  const indicatorChartsRef = useRef<Map<string, IChartApi>>(new Map());
  const indicatorSeriesRef = useRef<Map<string, ISeriesApi<any>>>(new Map());
  const macdSeriesRef = useRef<Map<string, { hist: ISeriesApi<any>; macd: ISeriesApi<any>; signal: ISeriesApi<any> }>>(new Map());
  const overlaySeriesRef = useRef<Map<string, ISeriesApi<"Line">>>(new Map());

  const usedColorsRef = useRef<Set<string>>(new Set());

  // Get a unique random color
  const getUniqueColor = (): string => {
    const available = CHART_COLORS.filter(
      (c) => !usedColorsRef.current.has(c)
    );
    if (available.length === 0) {
      // If all colors used, pick random from full palette
      return CHART_COLORS[Math.floor(Math.random() * CHART_COLORS.length)];
    }
    const color = available[Math.floor(Math.random() * available.length)];
    usedColorsRef.current.add(color);
    return color;
  };

  const freeColor = (color?: string) => {
    if (color) usedColorsRef.current.delete(color);
  };

  // Calculate indicators
  const calculateSMA = (data: Candle[], period: number) => {
    const result: { time: UTCTimestamp; value: number }[] = [];
    for (let i = period - 1; i < data.length; i++) {
      const sum = data
        .slice(i - period + 1, i + 1)
        .reduce((acc, c) => acc + c.close, 0);
      result.push({ time: data[i].time, value: sum / period });
    }
    return result;
  };

  const calculateEMA = (data: Candle[], period: number) => {
    const result: { time: UTCTimestamp; value: number }[] = [];
    const k = 2 / (period + 1);
    let ema = data.slice(0, period).reduce((acc, c) => acc + c.close, 0) / period;

    for (let i = 0; i < data.length; i++) {
      if (i < period - 1) continue;
      if (i === period - 1) {
        result.push({ time: data[i].time, value: ema });
      } else {
        ema = data[i].close * k + ema * (1 - k);
        result.push({ time: data[i].time, value: ema });
      }
    }
    return result;
  };

  const calculateVWAP = (data: Candle[]) => {
    const result: { time: UTCTimestamp; value: number }[] = [];
    let cumVolume = 0;
    let cumVolPrice = 0;

    for (const candle of data) {
      const typical = (candle.high + candle.low + candle.close) / 3;
      const vol = candle.volume || 0;
      cumVolPrice += typical * vol;
      cumVolume += vol;
      if (cumVolume > 0) {
        result.push({ time: candle.time, value: cumVolPrice / cumVolume });
      }
    }
    return result;
  };

  const calculateRSI = (data: Candle[], period: number = 14) => {
    const result: { time: UTCTimestamp; value: number }[] = [];
    const changes: number[] = [];

    for (let i = 1; i < data.length; i++) {
      changes.push(data[i].close - data[i - 1].close);
    }

    for (let i = period; i < changes.length; i++) {
      const slice = changes.slice(i - period, i);
      const gains = slice.filter((c) => c > 0).reduce((a, b) => a + b, 0) / period;
      const losses =
        Math.abs(slice.filter((c) => c < 0).reduce((a, b) => a + b, 0)) / period;
      const rs = gains / (losses || 0.0001);
      const rsi = 100 - 100 / (1 + rs);
      result.push({ time: data[i + 1].time, value: rsi });
    }
    return result;
  };

  const calculateMACD = (data: Candle[]) => {
    const ema12 = calculateEMA(data, 12);
    const ema26 = calculateEMA(data, 26);

    const macdLine: { time: UTCTimestamp; value: number }[] = [];
    const minLen = Math.min(ema12.length, ema26.length);

    for (let i = 0; i < minLen; i++) {
      macdLine.push({
        time: ema12[i].time,
        value: ema12[i].value - ema26[i].value,
      });
    }

    const signalLine: { time: UTCTimestamp; value: number }[] = [];
    const k = 2 / 10;
    let signal =
      macdLine.slice(0, 9).reduce((acc, m) => acc + m.value, 0) / 9;

    for (let i = 0; i < macdLine.length; i++) {
      if (i < 8) continue;
      if (i === 8) {
        signalLine.push({ time: macdLine[i].time, value: signal });
      } else {
        signal = macdLine[i].value * k + signal * (1 - k);
        signalLine.push({ time: macdLine[i].time, value: signal });
      }
    }

    const histogram: { time: UTCTimestamp; value: number; color: string }[] =
      [];
    for (let i = 0; i < signalLine.length; i++) {
      const diff = macdLine[i + 8].value - signalLine[i].value;
      histogram.push({
        time: signalLine[i].time,
        value: diff,
        color: diff >= 0 ? "#22c55e" : "#ef4444",
      });
    }

    return { macdLine, signalLine, histogram };
  };

  // Initialize main chart
  useEffect(() => {
    if (!mainContainerRef.current) return;

    const chart = createChart(mainContainerRef.current, {
      width: mainContainerRef.current.clientWidth,
      height: 520,
      layout: {
        background: { color: "#0b0f19" },
        textColor: "#cbd5e1",
      },
      grid: {
        vertLines: { color: "#1f2937" },
        horzLines: { color: "#1f2937" },
      },
      rightPriceScale: {
        borderColor: "#334155",
      },
      timeScale: {
        borderColor: "#334155",
        timeVisible: true,
      },
      crosshair: {
        vertLine: { labelBackgroundColor: "#2563eb" },
        horzLine: { labelBackgroundColor: "#2563eb" },
      },
    });

    mainChartRef.current = chart;

    const series = chart.addCandlestickSeries({
      upColor: "#22c55e",
      downColor: "#ef4444",
      borderUpColor: "#22c55e",
      borderDownColor: "#ef4444",
      wickUpColor: "#22c55e",
      wickDownColor: "#ef4444",
    });

    candleSeriesRef.current = series;
    series.setData(candles);
    chart.timeScale().fitContent(); // Only fit on initial load

    const handleResize = () => {
      if (!mainContainerRef.current || !mainChartRef.current) return;
      mainChartRef.current.applyOptions({
        width: mainContainerRef.current.clientWidth,
      });
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      chart.remove();
      mainChartRef.current = null;
      candleSeriesRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Subscribe to crosshair updates whenever candles change
  useEffect(() => {
    if (!mainChartRef.current) return;

    const chart = mainChartRef.current;

    // Subscribe to crosshair move
    const handleCrosshairMove = (param: MouseEventParams) => {
      if (!param.time) {
        setHoverData(null);
        return;
      }

      // Find the candle at this time
      const index = candles.findIndex((c) => c.time === param.time);
      if (index === -1) {
        setHoverData(null);
        return;
      }

      const candle = candles[index];
      const prevCandle = index > 0 ? candles[index - 1] : null;
      const percentChange = prevCandle
        ? ((candle.close - prevCandle.close) / prevCandle.close) * 100
        : 0;

      const date = new Date((candle.time as number) * 1000);
      const timeStr = date.toLocaleString();

      setHoverData({
        time: timeStr,
        open: candle.open,
        high: candle.high,
        low: candle.low,
        close: candle.close,
        volume: candle.volume,
        percentChange,
      });
    };

    chart.subscribeCrosshairMove(handleCrosshairMove);

    // Note: v3.8.0 doesn't provide unsubscribe, cleanup happens on chart.remove()
  }, [candles]);

  // Update candles
  useEffect(() => {
    if (!candleSeriesRef.current) return;
    candleSeriesRef.current.setData(candles);
    
    // Update overlay indicators
    overlaySeriesRef.current.forEach((series, id) => {
      const ind = indicators.find((i) => i.id === id);
      if (!ind) return;

      let data: { time: UTCTimestamp; value: number }[] = [];
      if (ind.type === "sma") {
        data = calculateSMA(candles, ind.period || 20);
      } else if (ind.type === "ema") {
        data = calculateEMA(candles, ind.period || 20);
      } else if (ind.type === "vwap") {
        data = calculateVWAP(candles);
      }
      series.setData(data);
    });

    // Update panel indicators
    indicatorChartsRef.current.forEach((chart, id) => {
      const ind = indicators.find((i) => i.id === id);
      if (!ind) return;

      if (ind.type === "volume") {
        const series = indicatorSeriesRef.current.get(id);
        if (!series) return;
        const volumeData = candles.map((c) => ({
          time: c.time,
          value: c.volume || 0,
          color: c.close >= c.open ? "#22c55e80" : "#ef444480",
        }));
        series.setData(volumeData);
      } else if (ind.type === "rsi") {
        const series = indicatorSeriesRef.current.get(id);
        if (!series) return;
        const rsiData = calculateRSI(candles);
        series.setData(rsiData);
      } else if (ind.type === "macd") {
        const macdSeries = macdSeriesRef.current.get(id);
        if (!macdSeries) return;
        const { macdLine, signalLine, histogram } = calculateMACD(candles);
        macdSeries.hist.setData(histogram);
        macdSeries.macd.setData(macdLine);
        macdSeries.signal.setData(signalLine);
      }
    });
  }, [candles, indicators]);

  // Fit content only when explicitly requested
  useEffect(() => {
    if (shouldFitContent && mainChartRef.current) {
      mainChartRef.current.timeScale().fitContent();
    }
  }, [shouldFitContent]);

  // Sync time scales for all charts - rewritten to avoid conflicts
  useEffect(() => {
    if (!mainChartRef.current) return;

    const allCharts = [
      mainChartRef.current,
      ...Array.from(indicatorChartsRef.current.values()),
    ];

    if (allCharts.length <= 1) return; // No sync needed with only main chart

    // Use a flag to prevent circular updates
    let isSyncing = false;

    const syncFromMain = () => {
      if (isSyncing || !mainChartRef.current) return;
      
      const visibleRange = mainChartRef.current.timeScale().getVisibleRange();
      if (!visibleRange) return;

      isSyncing = true;
      
      // Sync all indicator charts to main chart
      indicatorChartsRef.current.forEach((chart) => {
        try {
          chart.timeScale().setVisibleRange(visibleRange);
        } catch (e) {
          // Silently handle any sync errors
        }
      });
      
      isSyncing = false;
    };

    // Only subscribe to main chart changes - one-way sync
    mainChartRef.current.timeScale().subscribeVisibleTimeRangeChange(syncFromMain);

    // Initial sync
    syncFromMain();

    // Cleanup note: v3.8.0 subscriptions are cleaned up when chart.remove() is called
  }, [indicators]);

  // Handle indicators
  useEffect(() => {
    if (!mainChartRef.current || !mainContainerRef.current) return;

    // Separate overlay vs panel indicators
    const overlayIndicators = indicators.filter((ind) =>
      ["sma", "ema", "vwap"].includes(ind.type)
    );
    const panelIndicators = indicators.filter((ind) =>
      ["volume", "macd", "rsi"].includes(ind.type)
    );

    // Remove old overlay series not in current list
    overlaySeriesRef.current.forEach((series, id) => {
      if (!overlayIndicators.find((ind) => ind.id === id)) {
        mainChartRef.current?.removeSeries(series);
        overlaySeriesRef.current.delete(id);
        const ind = indicators.find((i) => i.id === id);
        freeColor(ind?.color);
      }
    });

    // Add/update overlay series
    overlayIndicators.forEach((ind) => {
      if (!overlaySeriesRef.current.has(ind.id)) {
        const color = getUniqueColor();
        const series = mainChartRef.current!.addLineSeries({
          color,
          lineWidth: 2,
        });

        overlaySeriesRef.current.set(ind.id, series);
        onIndicatorColorAssigned(ind.id, color);

        let data: { time: UTCTimestamp; value: number }[] = [];
        if (ind.type === "sma") {
          data = calculateSMA(candles, ind.period || 20);
        } else if (ind.type === "ema") {
          data = calculateEMA(candles, ind.period || 20);
        } else if (ind.type === "vwap") {
          data = calculateVWAP(candles);
        }
        series.setData(data);
      }
    });

    // Remove old panel charts not in current list
    indicatorChartsRef.current.forEach((chart, id) => {
      if (!panelIndicators.find((ind) => ind.id === id)) {
        chart.remove();
        indicatorChartsRef.current.delete(id);
        indicatorSeriesRef.current.delete(id);
        macdSeriesRef.current.delete(id);
        const ind = indicators.find((i) => i.id === id);
        freeColor(ind?.color);
      }
    });

    // Create/update panel charts
    const container = mainContainerRef.current;
    const existingDivs = Array.from(
      container.querySelectorAll(".indicator-chart")
    );

    // Remove divs for deleted indicators
    existingDivs.forEach((div) => {
      const id = div.getAttribute("data-indicator-id");
      if (id && !panelIndicators.find((ind) => ind.id === id)) {
        div.remove();
      }
    });

    // Add new panel charts in order
    panelIndicators.forEach((ind, index) => {
      if (!indicatorChartsRef.current.has(ind.id)) {
        // Create container div
        const div = document.createElement("div");
        div.className = "indicator-chart";
        div.setAttribute("data-indicator-id", ind.id);
        div.style.width = "100%";
        div.style.marginTop = "12px";
        container.appendChild(div);

        let chartHeight = 150;
        if (ind.type === "volume") chartHeight = 120;

        const chart = createChart(div, {
          width: container.clientWidth,
          height: chartHeight,
          layout: {
            background: { color: "#0b0f19" },
            textColor: "#cbd5e1",
          },
          grid: {
            vertLines: { color: "#1f2937" },
            horzLines: { color: "#1f2937" },
          },
          rightPriceScale: {
            borderColor: "#334155",
          },
          timeScale: {
            borderColor: "#334155",
            visible: index === panelIndicators.length - 1,
          },
          crosshair: {
            vertLine: { labelBackgroundColor: "#2563eb" },
            horzLine: { labelBackgroundColor: "#2563eb" },
          },
        });

        indicatorChartsRef.current.set(ind.id, chart);

        if (ind.type === "volume") {
          const series = chart.addHistogramSeries({
            color: "#60a5fa",
            priceFormat: { type: "volume" },
          });
          const volumeData = candles.map((c) => ({
            time: c.time,
            value: c.volume || 0,
            color: c.close >= c.open ? "#22c55e80" : "#ef444480",
          }));
          series.setData(volumeData);
          indicatorSeriesRef.current.set(ind.id, series);
        } else if (ind.type === "rsi") {
          const series = chart.addLineSeries({
            color: "#a855f7",
            lineWidth: 2,
          });
          const rsiData = calculateRSI(candles);
          series.setData(rsiData);
          indicatorSeriesRef.current.set(ind.id, series);

          // Add reference lines at 30 and 70
          const line30 = chart.addLineSeries({
            color: "#4b5563",
            lineWidth: 1,
            lineStyle: 2,
            priceLineVisible: false,
            lastValueVisible: false,
          });
          line30.setData(
            candles.map((c) => ({ time: c.time, value: 30 }))
          );

          const line70 = chart.addLineSeries({
            color: "#4b5563",
            lineWidth: 1,
            lineStyle: 2,
            priceLineVisible: false,
            lastValueVisible: false,
          });
          line70.setData(
            candles.map((c) => ({ time: c.time, value: 70 }))
          );
        } else if (ind.type === "macd") {
          const { macdLine, signalLine, histogram } = calculateMACD(candles);

          const histSeries = chart.addHistogramSeries();
          histSeries.setData(histogram);

          const macdSeries = chart.addLineSeries({
            color: "#3b82f6",
            lineWidth: 2,
          });
          macdSeries.setData(macdLine);

          const signalSeries = chart.addLineSeries({
            color: "#f59e0b",
            lineWidth: 2,
          });
          signalSeries.setData(signalLine);

          indicatorSeriesRef.current.set(ind.id, histSeries);
          macdSeriesRef.current.set(ind.id, {
            hist: histSeries,
            macd: macdSeries,
            signal: signalSeries,
          });
        }

        // Don't call fitContent() here - preserve user's zoom/pan position

        // Sync with main chart's current visible range
        if (mainChartRef.current) {
          const mainRange = mainChartRef.current.timeScale().getVisibleRange();
          if (mainRange) {
            try {
              chart.timeScale().setVisibleRange(mainRange);
            } catch (e) {
              // If setting range fails, just use default
            }
          }
        }
      }
    });

    // Resize all indicator charts
    const handleResize = () => {
      if (!mainContainerRef.current) return;
      const width = mainContainerRef.current.clientWidth;
      indicatorChartsRef.current.forEach((chart) => {
        chart.applyOptions({ width });
      });
    };
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, [indicators, candles, onIndicatorColorAssigned]);

  return (
    <div style={{ width: "100%", position: "relative" }}>
      {/* Hover data panel */}
      {hoverData && (
        <div
          style={{
            position: "absolute",
            top: 8,
            left: 8,
            backgroundColor: "#111827ee",
            border: "1px solid #374151",
            borderRadius: 6,
            padding: "8px 12px",
            fontSize: "0.8rem",
            zIndex: 10,
            minWidth: 280,
          }}
        >
          <div style={{ marginBottom: 4, fontWeight: 600, color: "#93c5fd" }}>
            {hoverData.time}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px 12px" }}>
            <div>
              <span style={{ color: "#9ca3af" }}>O:</span>{" "}
              <span style={{ color: "#e5e7eb" }}>{hoverData.open.toFixed(2)}</span>
            </div>
            <div>
              <span style={{ color: "#9ca3af" }}>H:</span>{" "}
              <span style={{ color: "#e5e7eb" }}>{hoverData.high.toFixed(2)}</span>
            </div>
            <div>
              <span style={{ color: "#9ca3af" }}>L:</span>{" "}
              <span style={{ color: "#e5e7eb" }}>{hoverData.low.toFixed(2)}</span>
            </div>
            <div>
              <span style={{ color: "#9ca3af" }}>C:</span>{" "}
              <span style={{ color: "#e5e7eb" }}>{hoverData.close.toFixed(2)}</span>
            </div>
            {hoverData.volume !== undefined && (
              <div style={{ gridColumn: "1 / -1" }}>
                <span style={{ color: "#9ca3af" }}>Vol:</span>{" "}
                <span style={{ color: "#e5e7eb" }}>
                  {hoverData.volume.toLocaleString()}
                </span>
              </div>
            )}
            <div style={{ gridColumn: "1 / -1" }}>
              <span style={{ color: "#9ca3af" }}>Change:</span>{" "}
              <span
                style={{
                  color: hoverData.percentChange >= 0 ? "#22c55e" : "#ef4444",
                  fontWeight: 600,
                }}
              >
                {hoverData.percentChange >= 0 ? "+" : ""}
                {hoverData.percentChange.toFixed(2)}%
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Main chart container */}
      <div
        ref={mainContainerRef}
        style={{
          width: "100%",
          border: "1px solid #1f2937",
          borderRadius: 12,
          overflow: "hidden",
          padding: 12,
          backgroundColor: "#0b0f19",
        }}
      />
    </div>
  );
}