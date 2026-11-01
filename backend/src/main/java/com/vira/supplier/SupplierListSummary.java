package com.vira.supplier;

import java.math.BigDecimal;

public record SupplierListSummary(long totalSuppliers, long paymentCount,
                                  BigDecimal paymentTotal, BigDecimal cashInHand) {
}