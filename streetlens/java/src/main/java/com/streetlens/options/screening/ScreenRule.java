package com.streetlens.options.screening;
import com.streetlens.options.domain.OptionContract;
import com.streetlens.options.domain.Quote;

public interface ScreenRule {
    boolean accept(OptionContract c, Quote q);
}
