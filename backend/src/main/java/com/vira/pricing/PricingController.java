package com.vira.pricing;

import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/pricing")
public class PricingController {

    private final PricingService pricingService;

    public PricingController(PricingService pricingService) {
        this.pricingService = pricingService;
    }

    @GetMapping("/quote")
    public PriceQuote quote(@RequestParam Long itemId,
                             @RequestParam CustomerKind customer,
                             @RequestParam(required = false) Long partyId) {
        return pricingService.quote(itemId, customer, partyId);
    }

    @PostMapping("/permanent-changes")
    public PriceQuote permanentChange(@Valid @RequestBody PermanentPriceChange change) {
        return pricingService.savePermanent(change);
    }
}