package com.vira.pricing;

import com.vira.common.FieldValidationException;
import com.vira.common.Money;

import java.math.BigDecimal;

public final class PricingRules {
    private PricingRules() {}

    public static String moneyError(BigDecimal v) {
        if (v.signum() <= 0) return "Must be greater than 0";
        if (v.stripTrailingZeros().scale() > Money.SCALE) return "At most 2 decimal places";
        return null;
    }

    public static String discountError(BigDecimal v) {
        if (v.signum() < 0 || v.compareTo(Money.HUNDRED) > 0) return "Must be between 0 and 100";
        if (v.stripTrailingZeros().scale() > Money.SCALE) return "At most 2 decimal places";
        return null;
    }

    public static void checkMoney(String field, BigDecimal v) {
        String err = v == null ? "Required" : moneyError(v);
        if (err != null) throw new FieldValidationException(field, err);
    }

    public static void checkDiscount(String field, BigDecimal v) {
        String err = v == null ? "Required" : discountError(v);
        if (err != null) throw new FieldValidationException(field, err);
    }
}