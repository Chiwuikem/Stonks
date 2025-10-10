package com.streetlens.stockanalysis;

import java.io.BufferedReader;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;

public final class CsvLoader {
    private CsvLoader(){}

    /**
     * Load candles from a CSV with header:
     * Date,Open,High,Low,Close,Volume
     * Date format supported: yyyy-MM-dd or M/d/yyyy
     */
    public static List<StockCandle> load(Path csvPath) throws IOException {
        DateTimeFormatter f1 = DateTimeFormatter.ofPattern("yyyy-MM-dd");
        DateTimeFormatter f2 = DateTimeFormatter.ofPattern("M/d/yyyy");
        try (BufferedReader br = Files.newBufferedReader(csvPath, StandardCharsets.UTF_8)) {
            String line = br.readLine(); // header
            if (line == null) return List.of();
            List<StockCandle> out = new ArrayList<>();
            while ((line = br.readLine()) != null) {
                if (line.isBlank()) continue;
                String[] t = line.split(",", -1);
                if (t.length < 6) continue;
                String ds = t[0].trim();
                LocalDate d;
                try { d = LocalDate.parse(ds, f1); }
                catch (Exception e) { d = LocalDate.parse(ds, f2); }
                double open = parseDouble(t[1]);
                double high = parseDouble(t[2]);
                double low  = parseDouble(t[3]);
                double close= parseDouble(t[4]);
                long vol    = parseLong(t[5]);
                out.add(new StockCandle(d, open, high, low, close, vol));
            }
            return out;
        }
    }

    private static double parseDouble(String s){
        try { return Double.parseDouble(s.trim()); } catch(Exception e){ return Double.NaN; }
    }
    private static long parseLong(String s){
        try { return Long.parseLong(s.trim()); } catch(Exception e){ return 0L; }
    }
}
