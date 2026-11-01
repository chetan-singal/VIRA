package com.vira.supplier;

import java.math.BigDecimal;

public record SupplierPaymentTotals(long paymentCount, BigDecimal paymentTotal) {
}