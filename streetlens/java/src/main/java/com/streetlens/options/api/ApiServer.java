package com.streetlens.options.api;

import io.javalin.Javalin;

import com.streetlens.options.ingestion.OptionCsvLoader;
import com.streetlens.options.ranking.Ranker;
import com.streetlens.options.screening.Rules;
import com.streetlens.options.persistence.Db;

import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDate;
import java.util.*;
import java.util.concurrent.*;

public class ApiServer {

    public static void main(String[] args) {
        int port = 7070;
        var app = Javalin.create(cfg -> {
            cfg.showJavalinBanner = false;
        }).start(port);

        app.get("/health", ctx -> ctx.json(Map.of("status", "ok")));

        // GET /screen?csv=C:\path\to\options.csv&save=true&limit=20
        app.get("/screen", ctx -> {
            String csvPath = ctx.queryParam("csv");
            if (csvPath == null || csvPath.isBlank()) {
                ctx.status(400).json(Map.of("error", "missing query param 'csv'"));
                return;
            }
            boolean save = Boolean.parseBoolean(Objects.toString(ctx.queryParam("save"), "false"));
            int limit = parseIntOr(ctx.queryParam("limit"), 20);
            limit = Math.max(1, Math.min(limit, 500));

            var path = Path.of(csvPath);
            var rows = OptionCsvLoader.load(path);

            // --- same screen as CLI (tweak as you like)
            var screen = Rules.and(
                Rules.minVolume(500),
                Rules.minOpenInterest(2000),
                Rules.maxSpreadPct(0.12),
                Rules.dteBetween(7, 400),
                Rules.deltaBetween(-0.50, 0.50)
            );

            var ranker = new Ranker();
            var pool = Executors.newFixedThreadPool(Math.min(8, Runtime.getRuntime().availableProcessors()));
            List<Ranker.Scored> results;
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
                  .limit(limit)
                  .toList();
            } finally {
                pool.shutdownNow();
            }

            // save if requested
            if (save && !results.isEmpty()) {
                Path dbPath = Paths.get("target", "streetlens.db");
                try (Db db = new Db(dbPath)) {
                    for (var s : results) {
                        long dte = s.contract().expiry().toEpochDay() - LocalDate.now().toEpochDay();
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
                }
            }

            // return JSON
            var json = results.stream().map(s -> Map.of(
                "symbol", s.contract().symbol(),
                "type", s.contract().type().name(),
                "strike", s.contract().strike(),
                "dte", s.contract().expiry().toEpochDay() - LocalDate.now().toEpochDay(),
                "mid", s.quote().mid(),
                "score", s.score(),
                "volume", s.quote().volume(),
                "openInterest", s.quote().openInterest(),
                "spreadPct", s.quote().spreadPct() * 100.0
            )).toList();

            ctx.json(Map.of("count", json.size(), "results", json));
        });

        // GET /latest?limit=50
        app.get("/latest", ctx -> {
            int limit = parseIntOr(ctx.queryParam("limit"), 50);
            limit = Math.max(1, Math.min(limit, 500));
            Path dbPath = Paths.get("target", "streetlens.db");
            try (Db db = new Db(dbPath)) {
                var rows = db.latest(limit);
                ctx.json(Map.of("count", rows.size(), "rows", rows));
            }
        });

        System.out.println("API listening on http://localhost:" + port);
        System.out.println("Try:  /health,  /screen?csv=PATH&save=true,  /latest");
    }

    private static int parseIntOr(String s, int def){
        try { return Integer.parseInt(s); } catch (Exception e) { return def; }
    }
}
