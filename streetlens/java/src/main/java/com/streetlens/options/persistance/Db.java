package com.streetlens.options.persistence;

import java.nio.file.Path;
import java.sql.*;

public final class Db implements AutoCloseable {
    private final Connection conn;

    public Db(Path file) {
        try {
            this.conn = DriverManager.getConnection("jdbc:sqlite:" + file.toString());
            init();
        } catch (SQLException e) { throw new RuntimeException(e); }
    }

    private void init() throws SQLException {
        try (Statement st = conn.createStatement()) {
            st.execute("""
              create table if not exists option_scores(
                id integer primary key autoincrement,
                ts   datetime default (datetime('now')),
                symbol text, type text, strike real, dte integer,
                mid real, score real, volume integer, oi integer, spread_pct real
              );
            """);
        }
    }

    public void insert(String symbol, String type, double strike, long dte,
                       double mid, double score, long vol, long oi, double spreadPct) {
        try (PreparedStatement ps = conn.prepareStatement("""
            insert into option_scores(symbol,type,strike,dte,mid,score,volume,oi,spread_pct)
            values (?,?,?,?,?,?,?,?,?)
        """)) {
            ps.setString(1, symbol);
            ps.setString(2, type);
            ps.setDouble(3, strike);
            ps.setLong(4, dte);
            ps.setDouble(5, mid);
            ps.setDouble(6, score);
            ps.setLong(7, vol);
            ps.setLong(8, oi);
            ps.setDouble(9, spreadPct);
            ps.executeUpdate();
        } catch (SQLException e) { throw new RuntimeException(e); }
    }

    @Override public void close() {
        try { conn.close(); } catch (Exception ignore) {}
    }
}
