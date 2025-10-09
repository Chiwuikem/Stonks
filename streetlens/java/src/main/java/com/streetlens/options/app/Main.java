package com.streetlens.options.app;

import com.streetlens.options.domain.*;
import com.streetlens.options.screening.*;
import com.streetlens.options.ranking.*;
import java.time.LocalDate;
import java.util.*;
import java.util.concurrent.*;

public class Main {
    public static void main(String[] args) throws Exception {
        var today = LocalDate.now();
        var c1 = new OptionContract("AAPL", OptionType.CALL, 200, today.plusDays(21), 100);
        var q1 = new Quote(195, 0.32, 0.045, 21/365.0, 5.10, 5.40, 1200, 8000);

        var c2 = new OptionContract("AAPL", OptionType.PUT, 185, today.plusDays(21), 100);
        var q2 = new Quote(195, 0.31, 0.045, 21/365.0, 4.60, 4.85, 900, 7000);

        var universe = List.of(Map.entry(c1,q1), Map.entry(c2,q2));

        var screen = Rules.and(
            Rules.minVolume(500),
            Rules.minOpenInterest(2000),
            Rules.maxSpreadPct(0.08),
            Rules.dteBetween(7, 45),
            Rules.deltaBetween(-0.35, 0.35)
        );

        var ranker = new Ranker();
        var pool = Executors.newFixedThreadPool(Math.min(4, Runtime.getRuntime().availableProcessors()));
        try {
            var futures = new ArrayList<Future<Ranker.Scored>>();
            for (var e : universe) {
                futures.add(pool.submit(() -> {
                    if (!screen.accept(e.getKey(), e.getValue())) return null;
                    return ranker.score(e.getKey(), e.getValue());
                }));
            }
            var results = futures.stream().map(f -> {
                try { return f.get(); } catch (Exception ex) { return null; }
            }).filter(Objects::nonNull)
              .sorted(Comparator.comparingDouble(Ranker.Scored::score).reversed())
              .toList();

            System.out.println("Top candidates:");
            for (var s : results) {
                long dte = s.contract().expiry().toEpochDay() - today.toEpochDay();
                System.out.printf("%s %s dte=%d strike=%.2f mid=%.2f score=%.4f%n",
                    s.contract().symbol(),
                    s.contract().type(),
                    dte,
                    s.contract().strike(),
                    s.quote().mid(),
                    s.score());
            }
        } finally {
            pool.shutdownNow();
        }
    }
}
