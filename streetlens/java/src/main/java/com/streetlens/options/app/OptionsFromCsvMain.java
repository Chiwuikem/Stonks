package com.streetlens.options.app;

import com.streetlens.options.domain.*;
import com.streetlens.options.ingestion.OptionCsvLoader;
import com.streetlens.options.screening.*;
import com.streetlens.options.ranking.*;
import com.streetlens.options.persistence.Db;     // <-- add

import java.nio.file.Path;
import java.nio.file.Paths;                      // <-- add
import java.util.*;
import java.util.concurrent.*;

public class OptionsFromCsvMain {
    public static void main(String[] args) throws Exception {
        boolean save = Arrays.stream(args).anyMatch("--save"::equals);
        Path dbPath = Paths.get("target", "streetlens.db");

        if (args.length < 1) {
            System.out.println("Usage: java -cp <jar> com.streetlens.options.app.OptionsFromCsvMain <CSV_PATH> [--save]");
            return;
        }

        var path = Path.of(args[0]);
        var rows = OptionCsvLoader.load(path);

        var screen = Rules.and(
            Rules.minVolume(500),
            Rules.minOpenInterest(2000),
            Rules.maxSpreadPct(0.08),
            Rules.dteBetween(7, 400),
            Rules.deltaBetween(-0.35, 0.35)
        );

        var ranker = new Ranker();
        var pool = Executors.newFixedThreadPool(Math.min(8, Runtime.getRuntime().availableProcessors()));
        List<Ranker.Scored> results;                     // <-- declare outside

        try {
            List<Future<Ranker.Scored>> futures = new ArrayList<>();
            for (var e : rows) {
                futures.add(pool.submit(() -> {
                    if (!screen.accept(e.getKey(), e.getValue())) return null;
                    return ranker.score(e.getKey(), e.getValue());
                }));
            }
            results = futures.stream().map(f -> {
                try { return f.get(); } catch (Exception ex) { return null; }
            }).filter(Objects::nonNull)
              .sorted(Comparator.comparingDouble(Ranker.Scored::score).reversed())
              .toList();

            if (results.isEmpty()) {
                System.out.println("No candidates passed the screen.");
            } else {
                System.out.println("Top candidates:");
                for (var s : results) {
                    long dte = s.contract().expiry().toEpochDay() - java.time.LocalDate.now().toEpochDay();
                    System.out.printf("%s %s dte=%d strike=%.2f mid=%.2f score=%.4f (vol=%d oi=%d spread=%.2f%%)%n",
                        s.contract().symbol(),
                        s.contract().type(),
                        dte,
                        s.contract().strike(),
                        s.quote().mid(),
                        s.score(),
                        s.quote().volume(),
                        s.quote().openInterest(),
                        s.quote().spreadPct()*100.0
                    );
                }
            }
        } finally {
            pool.shutdownNow();
        }

        // Save after we have 'results'
        if (save && results != null && !results.isEmpty()) {
            try (Db db = new Db(dbPath)) {
                for (var s : results) {
                    long dte = s.contract().expiry().toEpochDay() - java.time.LocalDate.now().toEpochDay();
                    db.insert(
                        s.contract().symbol(),
                        s.contract().type().name(),
                        s.contract().strike(),
                        dte,
                        s.quote().mid(),
                        s.score(),
                        s.quote().volume(),
                        s.quote().openInterest(),
                        s.quote().spreadPct() * 100.0
                    );
                }
                System.out.println("Saved " + results.size() + " rows to " + dbPath);
            }
        }
    }
}
