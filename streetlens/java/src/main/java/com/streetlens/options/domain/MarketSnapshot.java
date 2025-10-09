package com.streetlens.options.domain;
import java.util.List;
public record MarketSnapshot(
    String symbol, double spot, List<OptionContract> chain, List<Quote> quotes
) {}
