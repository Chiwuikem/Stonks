package com.streetlens.stockanalysis;

import java.time.LocalDate;

public record StockCandle(
    LocalDate date,
    double open,
    double high,
    double low,
    double close,
    long volume
) {}
