package com.streetlens.options.analytics;

import com.streetlens.options.domain.OptionType;

public final class OptionAnalytics {
    private OptionAnalytics(){}

    public static double breakEven(OptionType type, double strike, double premium){
        return (type==OptionType.CALL) ? strike + premium : strike - premium;
    }

    public static double probITM(double d2, OptionType type){
        return (type==OptionType.CALL) ? cdf(d2) : cdf(-d2);
    }

    private static double cdf(double x){ return 0.5 * (1.0 + erf(x/Math.sqrt(2))); }
    private static double erf(double x){
        double sgn = Math.signum(x);
        x = Math.abs(x);
        double a1=0.254829592,a2=-0.284496736,a3=1.421413741,a4=-1.453152027,a5=1.061405429,p=0.3275911;
        double t = 1.0/(1.0 + p*x);
        double y = 1.0 - (((((a5*t + a4)*t) + a3)*t + a2)*t + a1)*t*Math.exp(-x*x);
        return sgn*y;
    }
}
