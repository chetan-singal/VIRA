package com.vira.pricing;

import com.vira.common.Money;
import com.vira.item.ItemType;

import java.math.BigDecimal;

public final class PricingCalculator {
    private PricingCalculator() {}

    /** SRS §7.2: MRP − (MRP × discount / 100). One rounding step, at the end. */
    public static BigDecimal mrpRate(BigDecimal mrp, BigDecimal discountPercent) {
        return mrp.multiply(Money.HUNDRED.subtract(discountPercent))
                .divide(Money.HUNDRED, Money.SCALE, Money.ROUNDING);
    }

    /** What a bill line holds after any edit. No database access. */
    public static LinePrice priceLine(ItemType type, BigDecimal mrp,
                                       BigDecimal discountPercent, BigDecimal netRate) {
        if (type == ItemType.MRP) {
            PricingRules.checkMoney("mrp", mrp);
            PricingRules.checkDiscount("discountPercent", discountPercent);
            return new LinePrice(Money.round(mrp), Money.round(discountPercent),
                    mrpRate(mrp, discountPercent));
        }
        PricingRules.checkMoney("netRate", netRate);
        return new LinePrice(null, null, Money.round(netRate));
    }
}