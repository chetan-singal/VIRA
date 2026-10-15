package com.vira.item;

import com.vira.common.BusinessRuleException;
import com.vira.common.FieldErrors;
import com.vira.common.FieldValidationException;
import com.vira.common.Money;
import com.vira.common.NotFoundException;
import com.vira.common.PageResponse;
import com.vira.pricing.CashItemRateRepository;
import com.vira.pricing.PartyItemRateRepository;
import com.vira.pricing.PricingCalculator;
import com.vira.pricing.PricingRules;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Service
public class ItemService {

    private final ItemRepository items;
    private final PartCategoryRepository categories;
    private final BikeRepository bikes;
    private final PartyItemRateRepository partyRates;
    private final CashItemRateRepository cashRates;

    public ItemService(ItemRepository items, PartCategoryRepository categories,
                        BikeRepository bikes, PartyItemRateRepository partyRates,
                        CashItemRateRepository cashRates) {
        this.items = items;
        this.categories = categories;
        this.bikes = bikes;
        this.partyRates = partyRates;
        this.cashRates = cashRates;
    }

        @Transactional(readOnly = true)
    public PageResponse<ItemResponse> list(String q, ItemType type, Long categoryId, Pageable pageable) {
        Specification<Item> spec = Specification.allOf(
                ItemSpecifications.nameContains(q),
                ItemSpecifications.hasType(type),
                ItemSpecifications.inCategory(categoryId));
        return PageResponse.of(items.findAll(spec, pageable).map(i -> toResponse(i, null)));
    }

    @Transactional(readOnly = true)
    public ItemResponse get(Long id) {
        Item item = find(id);
        return toResponse(item, hasOverrides(id));
    }

    @Transactional
    public ItemResponse create(ItemRequest r) {
        validate(r);
        Item item = new Item();
        apply(item, r);
        Item saved = items.save(item);
        return toResponse(saved, false);
    }

    @Transactional
    public ItemResponse update(Long id, ItemRequest r) {
        Item item = find(id);
        validate(r);
        if (r.itemType() != item.getItemType() && hasOverrides(id)) {
            throw new BusinessRuleException("ITEM_TYPE_LOCKED",
                    "This item has saved Party or Cash rates, so its type cannot be changed. Remove those first.");
        }
        apply(item, r);
        return toResponse(item, hasOverrides(id));
    }

    @Transactional
    public void delete(Long id) {
        items.delete(find(id));
    }

    private boolean hasOverrides(Long id) {
        return partyRates.existsByItemId(id) || cashRates.existsByItemId(id);
    }

    private Item find(Long id) {
        return items.findById(id).orElseThrow(() -> new NotFoundException("Item " + id + " not found"));
    }

    private void validate(ItemRequest r) {
        FieldErrors errors = new FieldErrors();
        // r.unit() == null must be checked FIRST — Set.of(...).contains(null) throws NPE, it never just returns false
        if (r.unit() == null || !Units.ALLOWED.contains(r.unit()))
            errors.add("unit", "Choose Pcs, Pkg/Pack or Box");
        if (r.itemType() == ItemType.MRP) {
            errors.addIfNotNull("mrp", r.mrp() == null ? "MRP is required" : PricingRules.moneyError(r.mrp()));
            errors.addIfNotNull("defaultDiscountPercent", r.defaultDiscountPercent() == null
                    ? "Default discount is required" : PricingRules.discountError(r.defaultDiscountPercent()));
            if (r.defaultNetRate() != null) errors.add("defaultNetRate", "Not applicable to an MRP item");
        } else {
            errors.addIfNotNull("defaultNetRate", r.defaultNetRate() == null
                    ? "Default net rate is required" : PricingRules.moneyError(r.defaultNetRate()));
            if (r.mrp() != null) errors.add("mrp", "Not applicable to a Net Rate item");
            if (r.defaultDiscountPercent() != null) errors.add("defaultDiscountPercent", "Not applicable to a Net Rate item");
        }
        errors.throwIfAny();
    }

    private void apply(Item item, ItemRequest r) {
        item.setName(r.name().trim());
        item.setUnit(r.unit());

        if (r.partCategoryId() == null) {
            item.setPartCategory(null);
        } else {
            PartCategory category = categories.findById(r.partCategoryId())
                    .orElseThrow(() -> new FieldValidationException("partCategoryId", "Category not found"));
            item.setPartCategory(category);
        }

        Set<Bike> foundBikes = r.bikeIds() == null || r.bikeIds().isEmpty()
                ? new HashSet<>()
                : new HashSet<>(bikes.findAllById(r.bikeIds()));
        if (r.bikeIds() != null && foundBikes.size() != r.bikeIds().size()) {
            throw new FieldValidationException("bikeIds", "One or more bikes not found");
        }
        item.getBikes().clear();
        item.getBikes().addAll(foundBikes);

        item.setItemType(r.itemType());
        if (r.itemType() == ItemType.MRP) {
            item.setMrp(Money.round(r.mrp()));
            item.setDefaultDiscountPercent(Money.round(r.defaultDiscountPercent()));
            item.setDefaultNetRate(null);
        } else {
            item.setDefaultNetRate(Money.round(r.defaultNetRate()));
            item.setMrp(null);
            item.setDefaultDiscountPercent(null);
        }
    }

    private ItemResponse toResponse(Item item, Boolean typeLocked) {
        IdName category = item.getPartCategory() == null ? null
                : new IdName(item.getPartCategory().getId(), item.getPartCategory().getName());
        List<IdName> bikeList = item.getBikes().stream()
                .map(b -> new IdName(b.getId(), b.getName()))
                .sorted(Comparator.comparing(IdName::name))
                .toList();
        BigDecimal defaultRate = item.getItemType() == ItemType.MRP
                ? PricingCalculator.mrpRate(item.getMrp(), item.getDefaultDiscountPercent())
                : item.getDefaultNetRate();
        return new ItemResponse(item.getId(), item.getName(), item.getUnit(),
                category, bikeList, item.getItemType(),
                item.getMrp(), item.getDefaultDiscountPercent(), item.getDefaultNetRate(),
                defaultRate, typeLocked);
    }
}