package com.streetlens.options.ingestion;

import com.streetlens.options.domain.*;
import java.io.BufferedReader;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.*;
import java.time.*;
import java.time.format.DateTimeFormatter;
import java.util.*;

public final class OptionCsvLoader {
    private OptionCsvLoader(){}

    public static List<Map.Entry<OptionContract, Quote>> load(Path csvPath) throws IOException {
        List<Map.Entry<OptionContract, Quote>> out = new ArrayList<>();
        DateTimeFormatter expFmt = DateTimeFormatter.ofPattern("yyyy-MM-dd");
        try (BufferedReader br = Files.newBufferedReader(csvPath, StandardCharsets.UTF_8)) {
            String header = br.readLine(); // expect header
            if (header == null) return List.of();
            String line;
            while ((line = br.readLine()) != null) {
                if (line.isBlank()) continue;
                // symbol,type,strike,expiry,spot,iv,r,bid,ask,volume,openInterest
                String[] t = line.split(",", -1);
                if (t.length < 11) continue;

                String symbol = t[0].trim();
                OptionType type = OptionType.valueOf(t[1].trim().toUpperCase());
                double strike = Double.parseDouble(t[2].trim());
                LocalDate expiry = LocalDate.parse(t[3].trim(), expFmt);
                double spot = Double.parseDouble(t[4].trim());
                double iv   = Double.parseDouble(t[5].trim());
                double r    = Double.parseDouble(t[6].trim());
                double bid  = Double.parseDouble(t[7].trim());
                double ask  = Double.parseDouble(t[8].trim());
                long volume = Long.parseLong(t[9].trim());
                long oi     = Long.parseLong(t[10].trim());

                // time to expiry in years (ACT/365 approx)
                double daysToExp = Duration.between(LocalDate.now().atStartOfDay(), expiry.atStartOfDay()).toDays();
                if (daysToExp <= 0) continue; // skip expired
                double tYears = daysToExp / 365.0;

                OptionContract c = new OptionContract(symbol, type, strike, expiry, 100);
                Quote q = new Quote(spot, iv, r, tYears, bid, ask, volume, oi);
                out.add(Map.entry(c, q));
            }
        }
        return out;
    }
}
