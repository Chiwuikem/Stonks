package com.streetlens.options.domain;
public record Quote(
    double spot,
    double iv,
    double r,
    double t,
    double bid,
    double ask,
    long volume,
    long openInterest
) {
    public double mid() { return (bid + ask) / 2.0; }
    public double spreadPct() { return (ask - bid) / Math.max(1e-9, mid()); }
}
