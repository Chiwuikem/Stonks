package com.streetlens.options.ranking;

import com.streetlens.options.domain.*;
import com.streetlens.options.pricing.BlackScholes;
import com.streetlens.options.analytics.OptionAnalytics;

public final class Ranker {
    public record Scored(OptionContract contract, Quote quote, double score) {}

    public Scored score(OptionContract c, Quote q){
        var g = BlackScholes.greeks(c.type(), q.spot(), c.strike(), q.r(), q.iv(), q.t());
        double premium = q.mid();
        double be = OptionAnalytics.breakEven(c.type(), c.strike(), premium);
        double beEdge = (c.type()==OptionType.CALL) ? (be - q.spot()) : (q.spot() - be);
        double liq = Math.log1p(q.volume() + q.openInterest());
        double tightness = 1.0 / (1e-6 + q.spreadPct());
        double probITM = OptionAnalytics.probITM(g.d2(), c.type());

        double score = 0.35*beEdge + 0.25*liq + 0.25*tightness + 0.15*probITM;
        return new Scored(c, q, score);
    }
}
