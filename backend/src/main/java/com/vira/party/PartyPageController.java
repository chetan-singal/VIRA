package com.vira.party;

import com.vira.pricing.PartyItemRateRow;
import com.vira.pricing.PricingService;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/parties/{id}")
public class PartyPageController {

    private final PartyService partyService;
    private final PartySummaryService summaryService;
    private final PricingService pricingService;

    public PartyPageController(PartyService partyService, PartySummaryService summaryService,
                               PricingService pricingService) {
        this.partyService = partyService;
        this.summaryService = summaryService;
        this.pricingService = pricingService;
    }

    @GetMapping("/item-rates")
    public List<PartyItemRateRow> itemRates(@PathVariable Long id) {
        partyService.get(id);                       // 404 if the party does not exist
        return pricingService.listPartyRates(id);
    }

    @GetMapping("/balance-summary")
    public PartyBalanceSummary balanceSummary(@PathVariable Long id) {
        return summaryService.summary(id);
    }
}