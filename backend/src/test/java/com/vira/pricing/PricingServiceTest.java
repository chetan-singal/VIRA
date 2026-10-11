package com.vira.pricing;

import com.vira.common.FieldValidationException;
import com.vira.item.Item;
import com.vira.item.ItemRepository;
import com.vira.support.TestData;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@SpringBootTest
@ActiveProfiles("test")
@Transactional
class PricingServiceTest {

    @Autowired private PricingService pricingService;
    @Autowired private ItemRepository items;
    @Autowired private JdbcTemplate jdbc;

    private static BigDecimal bd(String s) { return new BigDecimal(s); }

    private Long insertMrpItem(String name, String mrp, String discount) {
        jdbc.update("insert into item (name, unit, item_type, mrp, default_discount_percent) values (?,?,?,?,?)",
                name, "Pcs", "MRP", bd(mrp), bd(discount));
        return jdbc.queryForObject("select id from item where name = ?", Long.class, name);
    }

    private Long insertNetRateItem(String name, String netRate) {
        jdbc.update("insert into item (name, unit, item_type, default_net_rate) values (?,?,?,?)",
                name, "Box", "NET_RATE", bd(netRate));
        return jdbc.queryForObject("select id from item where name = ?", Long.class, name);
    }

    @Test
    void mrp_item_party_uses_override_when_present_else_default() {
        Long itemId = insertMrpItem("Brake Pad", "500.00", "10.00");
        Long partyId = TestData.insertParty(jdbc, "Party A");

        PriceQuote before = pricingService.quote(itemId, CustomerKind.PARTY, partyId);
        assertThat(before.rate()).isEqualByComparingTo("450.00");
        assertThat(before.source()).isEqualTo(PriceSource.ITEM_DEFAULT);

        pricingService.savePermanent(new PermanentPriceChange(itemId, CustomerKind.PARTY, partyId,
                PricedField.DISCOUNT_PERCENT, bd("20.00")));

        PriceQuote after = pricingService.quote(itemId, CustomerKind.PARTY, partyId);
        assertThat(after.rate()).isEqualByComparingTo("400.00");
        assertThat(after.source()).isEqualTo(PriceSource.PARTY_OVERRIDE);
    }

    @Test
    void mrp_item_cash_uses_override_when_present_else_default() {
        Long itemId = insertMrpItem("Brake Pad", "500.00", "10.00");

        assertThat(pricingService.quote(itemId, CustomerKind.CASH, null).rate())
                .isEqualByComparingTo("450.00");

        pricingService.savePermanent(new PermanentPriceChange(itemId, CustomerKind.CASH, null,
                PricedField.DISCOUNT_PERCENT, bd("15.00")));

        PriceQuote after = pricingService.quote(itemId, CustomerKind.CASH, null);
        assertThat(after.rate()).isEqualByComparingTo("425.00");
        assertThat(after.source()).isEqualTo(PriceSource.CASH_OVERRIDE);
    }

    @Test
    void net_rate_item_party_and_cash_use_override_when_present_else_default() {
        Long itemId = insertNetRateItem("Chain Lube", "650.00");
        Long partyId = TestData.insertParty(jdbc, "Party A");

        assertThat(pricingService.quote(itemId, CustomerKind.PARTY, partyId).rate())
                .isEqualByComparingTo("650.00");
        assertThat(pricingService.quote(itemId, CustomerKind.CASH, null).rate())
                .isEqualByComparingTo("650.00");

        pricingService.savePermanent(new PermanentPriceChange(itemId, CustomerKind.PARTY, partyId,
                PricedField.NET_RATE, bd("600.00")));

        assertThat(pricingService.quote(itemId, CustomerKind.PARTY, partyId).rate())
                .isEqualByComparingTo("600.00");
        assertThat(pricingService.quote(itemId, CustomerKind.CASH, null).rate())
                .isEqualByComparingTo("650.00");
    }

    @Test
    void overrides_never_cross_between_cash_and_other_parties() {
        Long itemId = insertMrpItem("Brake Pad", "500.00", "10.00");
        Long partyA = TestData.insertParty(jdbc, "Party A");
        Long partyB = TestData.insertParty(jdbc, "Party B");

        pricingService.savePermanent(new PermanentPriceChange(itemId, CustomerKind.PARTY, partyA,
                PricedField.DISCOUNT_PERCENT, bd("20.00")));
        pricingService.savePermanent(new PermanentPriceChange(itemId, CustomerKind.CASH, null,
                PricedField.DISCOUNT_PERCENT, bd("30.00")));

        assertThat(pricingService.quote(itemId, CustomerKind.PARTY, partyA).rate())
                .isEqualByComparingTo("400.00");
        assertThat(pricingService.quote(itemId, CustomerKind.PARTY, partyB).rate())
                .isEqualByComparingTo("450.00");
        assertThat(pricingService.quote(itemId, CustomerKind.CASH, null).rate())
                .isEqualByComparingTo("350.00");
    }

    @Test
    void changing_item_mrp_moves_both_cash_and_party_prices() {
        Long itemId = insertMrpItem("Brake Pad", "500.00", "10.00");
        Long partyId = TestData.insertParty(jdbc, "Party A");

        pricingService.savePermanent(new PermanentPriceChange(itemId, CustomerKind.CASH, null,
                PricedField.MRP, bd("550.00")));

        assertThat(pricingService.quote(itemId, CustomerKind.CASH, null).rate())
                .isEqualByComparingTo("495.00");
        assertThat(pricingService.quote(itemId, CustomerKind.PARTY, partyId).rate())
                .isEqualByComparingTo("495.00");
        assertThat(items.findById(itemId).orElseThrow().getMrp()).isEqualByComparingTo("550.00");
    }

    @Test
    void net_rate_quote_has_null_mrp_and_discount() {
        Long itemId = insertNetRateItem("Chain Lube", "650.00");

        PriceQuote quote = pricingService.quote(itemId, CustomerKind.CASH, null);
        assertThat(quote.mrp()).isNull();
        assertThat(quote.discountPercent()).isNull();
    }

    @Test
    void second_permanent_change_for_same_party_item_updates_same_row() {
        Long itemId = insertMrpItem("Brake Pad", "500.00", "10.00");
        Long partyId = TestData.insertParty(jdbc, "Party A");

        pricingService.savePermanent(new PermanentPriceChange(itemId, CustomerKind.PARTY, partyId,
                PricedField.DISCOUNT_PERCENT, bd("20.00")));
        pricingService.savePermanent(new PermanentPriceChange(itemId, CustomerKind.PARTY, partyId,
                PricedField.DISCOUNT_PERCENT, bd("25.00")));

        Integer rowCount = jdbc.queryForObject(
                "select count(*) from party_item_rate where party_id = ? and item_id = ?",
                Integer.class, partyId, itemId);
        assertThat(rowCount).isEqualTo(1);
        assertThat(pricingService.quote(itemId, CustomerKind.PARTY, partyId).rate())
                .isEqualByComparingTo("375.00");
    }

    @Test
    void wrong_field_for_item_type_is_rejected() {
        Long itemId = insertMrpItem("Brake Pad", "500.00", "10.00");

        assertThatThrownBy(() -> pricingService.savePermanent(
                new PermanentPriceChange(itemId, CustomerKind.CASH, null, PricedField.NET_RATE, bd("650.00"))))
                .isInstanceOf(FieldValidationException.class);
    }
}