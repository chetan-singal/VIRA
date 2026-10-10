package com.vira.common;

import java.math.BigDecimal;
import java.math.RoundingMode;

public final class Money {

    public static final int SCALE = 2;
    public static final RoundingMode ROUNDING = RoundingMode.HALF_UP;
    public static final BigDecimal HUNDRED = new BigDecimal("100");

    private Money() {}

    public static BigDecimal round(BigDecimal v) {
        return v.setScale(SCALE, ROUNDING);
    }
}