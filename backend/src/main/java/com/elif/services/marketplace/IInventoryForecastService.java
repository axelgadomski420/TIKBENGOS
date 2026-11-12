package com.elif.services.marketplace;

import com.elif.dto.marketplace.InventoryForecastReportResponse;
import com.elif.dto.marketplace.InventoryForecastRequest;

public interface IInventoryForecastService {
    InventoryForecastReportResponse generateForecastReport(InventoryForecastRequest request);
}
