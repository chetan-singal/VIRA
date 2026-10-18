package com.vira.bill;

import com.vira.item.ItemType;

import java.math.BigDecimal;

public record BillLineResponse(
        Long itemId,
        String itemName,
        String unit,
        ItemType itemType,
        BigDecimal mrp,
        BigDecimal discountPercent,
        BigDecimal rate,
        Integer qty,
        BigDecimal amount,
        Integer lineNo) {
}