package com.vira.pricing;

import com.vira.common.FieldValidationException;
import com.vira.common.Money;
import com.vira.common.NotFoundException;
import com.vira.item.Item;
import com.vira.item.ItemRepository;
import com.vira.item.ItemType;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.Optional;

@Service
public class PricingService {

    private final ItemRepository items;
    private final PartyItemRateRepository partyRates;
    private final CashItemRateRepository cashRates;

    public PricingService(ItemRepository items, PartyItemRateRepository partyRates,
                           CashItemRateRepository cashRates) {
        this.items = items;
        this.partyRates = partyRates;
        this.cashRates = cashRates;
    }

    @Transactional(readOnly = true)
    public PriceQuote quote(Long itemId, CustomerKind customer, Long partyId) {
        Item item = items.findById(itemId)
                .orElseThrow(() -> new NotFoundException("Item " + itemId + " not found"));
        if (customer == CustomerKind.PARTY && partyId == null)
            throw new FieldValidationException("partyId", "Required for a Party price");

        if (item.getItemType() == ItemType.MRP) {
            Optional<BigDecimal> override = customer == CustomerKind.PARTY
                    ? partyRates.findByPartyIdAndItemId(partyId, itemId).map(PartyItemRate::getDiscountPercent)
                    : cashRates.findByItemId(itemId).map(CashItemRate::getDiscountPercent);
            BigDecimal discount = override.orElse(item.getDefaultDiscountPercent());
            return new PriceQuote(itemId, ItemType.MRP, item.getMrp(), discount,
                    PricingCalculator.mrpRate(item.getMrp(), discount), source(override.isPresent(), customer));
        }

        Optional<BigDecimal> override = customer == CustomerKind.PARTY
                ? partyRates.findByPartyIdAndItemId(partyId, itemId).map(PartyItemRate::getNetRate)
                : cashRates.findByItemId(itemId).map(CashItemRate::getNetRate);
        return new PriceQuote(itemId, ItemType.NET_RATE, null, null,
                override.orElse(item.getDefaultNetRate()), source(override.isPresent(), customer));
    }

    @Transactional
    public PriceQuote savePermanent(PermanentPriceChange c) {
        Item item = items.findById(c.itemId())
                .orElseThrow(() -> new NotFoundException("Item " + c.itemId() + " not found"));
        BigDecimal v = c.newValue();
        switch (c.field()) {
            case MRP -> {
                requireType(item, ItemType.MRP, c.field());
                PricingRules.checkMoney("newValue", v);
                item.setMrp(Money.round(v));
            }
            case DISCOUNT_PERCENT -> {
                requireType(item, ItemType.MRP, c.field());
                PricingRules.checkDiscount("newValue", v);
                saveOverride(item.getId(), c, Money.round(v), null);
            }
            case NET_RATE -> {
                requireType(item, ItemType.NET_RATE, c.field());
                PricingRules.checkMoney("newValue", v);
                saveOverride(item.getId(), c, null, Money.round(v));
            }
        }
        return quote(c.itemId(), c.customer(), c.partyId());
    }

    private PriceSource source(boolean overridePresent, CustomerKind customer) {
        if (!overridePresent) return PriceSource.ITEM_DEFAULT;
        return customer == CustomerKind.PARTY ? PriceSource.PARTY_OVERRIDE : PriceSource.CASH_OVERRIDE;
    }

    private void requireType(Item item, ItemType required, PricedField field) {
        if (item.getItemType() != required) {
            throw new FieldValidationException("field",
                    field + " does not apply to a " + item.getItemType() + " item");
        }
    }

    private void saveOverride(Long itemId, PermanentPriceChange c, BigDecimal discountPercent, BigDecimal netRate) {
        if (c.customer() == CustomerKind.PARTY) {
            if (c.partyId() == null) {
                throw new FieldValidationException("partyId", "Required for a Party price");
            }
            PartyItemRate rate = partyRates.findByPartyIdAndItemId(c.partyId(), itemId)
                    .orElseGet(() -> new PartyItemRate(c.partyId(), itemId));
            if (discountPercent != null) rate.setDiscountPercent(discountPercent);
            else rate.setNetRate(netRate);
            partyRates.save(rate);
        } else {
            CashItemRate rate = cashRates.findByItemId(itemId)
                    .orElseGet(() -> new CashItemRate(itemId));
            if (discountPercent != null) rate.setDiscountPercent(discountPercent);
            else rate.setNetRate(netRate);
            cashRates.save(rate);
        }
    }
}