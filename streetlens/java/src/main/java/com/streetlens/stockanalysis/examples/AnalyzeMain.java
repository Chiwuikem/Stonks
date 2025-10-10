package com.streetlens.stockanalysis.examples;

import com.streetlens.stockanalysis.*;
import java.nio.file.Path;
import java.util.List;

public class AnalyzeMain {
    public static void main(String[] args) throws Exception {
        if (args.length < 2){
            System.out.println("Usage: java -cp <jar> com.streetlens.stockanalysis.examples.AnalyzeMain <SYMBOL> <CSV_PATH>");
            System.out.println("CSV columns: Date,Open,High,Low,Close,Volume  (with header)");
            return;
        }
        String symbol = args[0];
        Path csv = Path.of(args[1]);
        List<StockCandle> candles = CsvLoader.load(csv);
        var summary = TrendAnalyzer.analyze(symbol, candles);

        System.out.printf("Symbol: %s  (candles=%d)%n", summary.symbol(), summary.nCandles());
        System.out.printf("SMA20=%.2f  SMA50=%.2f  RSI14=%.2f  AnnVol=%.2f%%%n",
                summary.sma20(), summary.sma50(), summary.rsi14(), summary.annVol()*100.0);
        System.out.printf("Trend: %s%n", summary.trend());
        System.out.println(suggest(summary));
    }

    private static String suggest(TrendAnalyzer.Summary s){
        if (s.trend() == TrendAnalyzer.Trend.BULLISH && s.rsi14() < 70) {
            return "Suggestion: momentum up. Consider bullish structures (e.g., call spreads) if IV is reasonable.";
        } else if (s.trend() == TrendAnalyzer.Trend.BEARISH && s.rsi14() > 30) {
            return "Suggestion: momentum down. Consider bearish structures (e.g., put spreads) if thesis holds.";
        } else {
            return "Suggestion: mixed/sideways. Consider waiting or neutral strategies (e.g., iron condors) if IV is elevated.";
        }
    }
}
