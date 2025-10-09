package com.streetlens.options.domain;
import java.time.LocalDate;

public record OptionContract(
    String symbol,
    OptionType type,
    double strike,
    LocalDate expiry,
    int multiplier
) {}
