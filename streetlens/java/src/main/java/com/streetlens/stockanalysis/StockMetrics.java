package com.streetlens.stockanalysis;

import java.util.ArrayList;
import java.util.List;

public final class StockMetrics {
    private StockMetrics(){}

    public static List<Double> simpleReturns(List<StockCandle> candles){
        List<Double> r = new ArrayList<>();
        for (int i = 1; i < candles.size(); i++){
            double prev = candles.get(i-1).close();
            double cur  = candles.get(i).close();
            r.add((cur - prev) / prev);
        }
        return r;
    }

    public static double sma(List<StockCandle> candles, int period){
        if (candles.size() < period) return Double.NaN;
        double sum = 0;
        for (int i = candles.size()-period; i < candles.size(); i++){
            sum += candles.get(i).close();
        }
        return sum / period;
    }

    public static double stdev(List<Double> values){
        if (values.size() == 0) return Double.NaN;
        double mean = 0;
        for (double v: values) mean += v;
        mean /= values.size();
        double var = 0;
        for (double v: values){ double d = v - mean; var += d*d; }
        var /= values.size();
        return Math.sqrt(var);
    }

    public static double annualizedVol(List<Double> dailyReturns){
        double sd = stdev(dailyReturns);
        if (Double.isNaN(sd)) return Double.NaN;
        return sd * Math.sqrt(252.0);
    }

    public static double rsi(List<StockCandle> candles, int period){
        if (candles.size() <= period) return Double.NaN;
        double gain = 0, loss = 0;
        for (int i = 1; i <= period; i++){
            double ch = candles.get(i).close() - candles.get(i-1).close();
            if (ch >= 0) gain += ch; else loss -= ch;
        }
        gain /= period; loss /= period;
        for (int i = period+1; i < candles.size(); i++){
            double ch = candles.get(i).close() - candles.get(i-1).close();
            double g = Math.max(0, ch);
            double l = Math.max(0, -ch);
            gain = (gain*(period-1) + g) / period;
            loss = (loss*(period-1) + l) / period;
        }
        if (loss == 0) return 100.0;
        double rs = gain / loss;
        return 100.0 - (100.0 / (1.0 + rs));
    }
}
