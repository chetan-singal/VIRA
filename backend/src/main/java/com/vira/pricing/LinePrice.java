package com.vira.pricing;

import java.math.BigDecimal;

public record LinePrice(BigDecimal mrp, BigDecimal discountPercent, BigDecimal rate) {}