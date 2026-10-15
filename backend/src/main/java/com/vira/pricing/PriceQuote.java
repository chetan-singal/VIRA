// PriceQuote.java
package com.vira.pricing;

import java.math.BigDecimal;

import com.vira.item.ItemType;

public record PriceQuote(Long itemId, ItemType itemType,
                          BigDecimal mrp,
                          BigDecimal discountPercent,
                          BigDecimal rate,
                          PriceSource source) {}