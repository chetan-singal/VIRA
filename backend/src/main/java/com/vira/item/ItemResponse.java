package com.vira.item;

import java.math.BigDecimal;
import java.util.List;

public record ItemResponse(
        Long id, String name, String unit,
        IdName partCategory, List<IdName> bikes,
        ItemType itemType,
        BigDecimal mrp, BigDecimal defaultDiscountPercent, BigDecimal defaultNetRate,
        BigDecimal defaultRate,
        Boolean typeLocked) {}