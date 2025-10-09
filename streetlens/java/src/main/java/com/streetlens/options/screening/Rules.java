package com.streetlens.options.screening;

import com.streetlens.options.domain.*;
import com.streetlens.options.pricing.BlackScholes;

public final class Rules {
    private Rules(){}
    public static ScreenRule minVolume(long v){ return (c,q) -> q.volume() >= v; }
    public static ScreenRule minOpenInterest(long oi){ return (c,q) -> q.openInterest() >= oi; }
    public static ScreenRule maxSpreadPct(double pct){ return (c,q) -> q.spreadPct() <= pct; }
    public static ScreenRule deltaBetween(double lo,double hi){
        return (c,q) -> {
            var g = BlackScholes.greeks(
                c.type(), q.spot(), c.strike(), q.r(), q.iv(), q.t());
            return g.delta() >= lo && g.delta() <= hi;
        };
    }
    public static ScreenRule dteBetween(int lo,int hi){
        return (c,q) -> {
            double days = q.t()*365.0;
            return days >= lo && days <= hi;
        };
    }
    public static ScreenRule and(ScreenRule... rs){
        return (c,q) -> {
            for (var r: rs) if (!r.accept(c,q)) return false;
            return true;
        };
    }
}
