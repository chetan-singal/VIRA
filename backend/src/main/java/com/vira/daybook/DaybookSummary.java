package com.vira.daybook;

import java.math.BigDecimal;

public record DaybookSummary(long totalBills, BigDecimal totalSales,
                             BigDecimal cashBillSales, BigDecimal partySales) {
}