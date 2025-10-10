package com.streetlens.stockanalysis;

import java.util.List;

public final class TrendAnalyzer {
    public enum Trend { BULLISH, BEARISH, SIDEWAYS }

    public record Summary(
        String symbol,
        int nCandles,
        double sma20, double sma50,
        double rsi14,
        double annVol,
        Trend trend
    ){}

    public static Summary analyze(String symbol, List<StockCandle> candles){
        if (candles == null || candles.size() < 60){
            return new Summary(symbol, candles==null?0:candles.size(), Double.NaN, Double.NaN, Double.NaN, Double.NaN, Trend.SIDEWAYS);
        }
        double sma20 = StockMetrics.sma(candles, 20);
        double sma50 = StockMetrics.sma(candles, 50);
        double rsi14 = StockMetrics.rsi(candles, 14);
        var rets = StockMetrics.simpleReturns(candles);
        double annVol = StockMetrics.annualizedVol(rets);

        Trend t;
        if (Double.isNaN(sma20) || Double.isNaN(sma50)) t = Trend.SIDEWAYS;
        else if (sma20 > sma50 * 1.005) t = Trend.BULLISH;
        else if (sma20 < sma50 * 0.995) t = Trend.BEARISH;
        else t = Trend.SIDEWAYS;

        return new Summary(symbol, candles.size(), sma20, sma50, rsi14, annVol, t);
    }
}
