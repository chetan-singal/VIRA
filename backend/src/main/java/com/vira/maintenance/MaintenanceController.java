package com.vira.maintenance;

import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/maintenance/recalculate-balances")
public class MaintenanceController {

    private final RecalculateBalancesService service;

    public MaintenanceController(RecalculateBalancesService service) {
        this.service = service;
    }

    @GetMapping
    public RecalculateReport check() {
        return service.check();
    }

    @PostMapping("/cash")
    public RecalculateReport applyCash() {
        return service.applyCashCorrection();
    }

    @PostMapping("/parties/{partyId}")
    public RecalculateReport applyParty(@PathVariable Long partyId) {
        return service.applyPartyCorrection(partyId);
    }
}