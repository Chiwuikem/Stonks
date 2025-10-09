package com.streetlens.options.ingestion;
import com.streetlens.options.domain.MarketSnapshot;
import java.util.List;

public interface MarketDataSource {
    List<MarketSnapshot> latest();
}
