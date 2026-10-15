package com.vira.pricing;

import org.junit.jupiter.api.Test;

import com.vira.item.ItemType;

import java.math.BigDecimal;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class PricingCalculatorTest {

    private static BigDecimal bd(String s) { return new BigDecimal(s); }

    @Test
    void srs72_mrp500_discount10_gives450() {
        assertThat(PricingCalculator.mrpRate(bd("500.00"), bd("10.00")))
                .isEqualByComparingTo("450.00");
    }

    @Test
    void rounds_half_up_once_at_the_end() {
        assertThat(PricingCalculator.mrpRate(bd("499.00"), bd("7.50")))
                .isEqualByComparingTo("461.58");
    }

    @Test
    void zero_discount_gives_mrp_and_full_discount_gives_zero() {
        assertThat(PricingCalculator.mrpRate(bd("500.00"), bd("0.00")))
                .isEqualByComparingTo("500.00");
        assertThat(PricingCalculator.mrpRate(bd("500.00"), bd("100.00")))
                .isEqualByComparingTo("0.00");
    }

    @Test
    void net_rate_line_has_no_mrp_and_no_discount() {
        LinePrice lp = PricingCalculator.priceLine(ItemType.NET_RATE, null, null, bd("650.00"));
        assertThat(lp.mrp()).isNull();
        assertThat(lp.discountPercent()).isNull();
        assertThat(lp.rate()).isEqualByComparingTo("650.00");
    }

    @Test
    void out_of_range_values_are_rejected() {
        assertThatThrownBy(() ->
                PricingCalculator.priceLine(ItemType.MRP, bd("500.00"), bd("-0.01"), null))
                .isInstanceOf(com.vira.common.FieldValidationException.class);
        assertThatThrownBy(() ->
                PricingCalculator.priceLine(ItemType.MRP, bd("500.00"), bd("100.01"), null))
                .isInstanceOf(com.vira.common.FieldValidationException.class);
        assertThatThrownBy(() ->
                PricingCalculator.priceLine(ItemType.MRP, bd("0.00"), bd("10.00"), null))
                .isInstanceOf(com.vira.common.FieldValidationException.class);
    }
}