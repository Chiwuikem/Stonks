package com.streetlens.options.pricing;

import com.streetlens.options.domain.OptionType;

public final class BlackScholes {
    private BlackScholes(){}

    private static double phi(double x){ return 0.5 * (1.0 + erf(x / Math.sqrt(2.0))); }
    private static double npdf(double x){ return Math.exp(-0.5*x*x) / Math.sqrt(2*Math.PI); }

    private static double erf(double x){
        double sgn = Math.signum(x);
        x = Math.abs(x);
        double a1=0.254829592,a2=-0.284496736,a3=1.421413741,a4=-1.453152027,a5=1.061405429,p=0.3275911;
        double t = 1.0/(1.0 + p*x);
        double y = 1.0 - (((((a5*t + a4)*t) + a3)*t + a2)*t + a1)*t*Math.exp(-x*x);
        return sgn*y;
    }

    public static double d1(double S,double K,double r,double sigma,double T){
        return (Math.log(S/K) + (r + 0.5*sigma*sigma)*T) / (sigma*Math.sqrt(T));
    }
    public static double d2(double d1,double sigma,double T){ return d1 - sigma*Math.sqrt(T); }

    public static double price(OptionType type, double S,double K,double r,double sigma,double T){
        double d1v = d1(S,K,r,sigma,T);
        double d2v = d2(d1v,sigma,T);
        return switch (type){
            case CALL -> S*phi(d1v) - K*Math.exp(-r*T)*phi(d2v);
            case PUT  -> K*Math.exp(-r*T)*phi(-d2v) - S*phi(-d1v);
        };
    }

    public static Greeks greeks(OptionType type, double S,double K,double r,double sigma,double T){
        double d1v = d1(S,K,r,sigma,T);
        double d2v = d2(d1v,sigma,T);
        double nd1 = npdf(d1v);
        double delta = (type==OptionType.CALL)? phi(d1v) : (phi(d1v)-1.0);
        double gamma = nd1/(S*sigma*Math.sqrt(T));
        double vega  = S*nd1*Math.sqrt(T);
        double theta = switch(type){
            case CALL -> -(S*nd1*sigma)/(2*Math.sqrt(T)) - r*K*Math.exp(-r*T)*phi(d2v);
            case PUT  -> -(S*nd1*sigma)/(2*Math.sqrt(T)) + r*K*Math.exp(-r*T)*phi(-d2v);
        };
        double rho   = switch(type){
            case CALL ->  K*T*Math.exp(-r*T)*phi(d2v);
            case PUT  -> -K*T*Math.exp(-r*T)*phi(-d2v);
        };
        // itmProbApprox uses N(d2) for calls, N(-d2) for puts
        double itmProbApprox = (type==OptionType.CALL)? phi(d2v) : phi(-d2v);
        return new Greeks(delta, gamma, vega, theta, rho, itmProbApprox, d1v, d2v);
    }

    public record Greeks(
        double delta,double gamma,double vega,double theta,double rho,
        double itmProbApprox,double d1,double d2
    ) {}
}
