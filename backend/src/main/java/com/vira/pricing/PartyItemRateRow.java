package com.vira.pricing;

import com.vira.item.ItemType;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public record PartyItemRateRow(
        Long itemId, String itemName, String unit, ItemType itemType,
        BigDecimal mrp, BigDecimal discountPercent, BigDecimal netRate, BigDecimal rate,
        LocalDateTime updatedAt) {
}