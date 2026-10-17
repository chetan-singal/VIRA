package com.vira.ledger;

import com.vira.common.NotFoundException;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class NumberSequenceService {

    public static final String CASH_BILL = "CASH_BILL";
    public static final String PARTY_BILL = "PARTY_BILL";
    public static final String VOUCHER = "VOUCHER";
    public static final String SUPPLIER_PAYMENT = "SUPPLIER_PAYMENT";

    private final NumberSequenceRepository repo;

    public NumberSequenceService(NumberSequenceRepository repo) {
        this.repo = repo;
    }

    @Transactional
    public int nextValue(String sequenceName) {
        NumberSequence seq = repo.lockForUpdate(sequenceName)
                .orElseThrow(() -> new NotFoundException("Unknown sequence: " + sequenceName));
        int issued = seq.getNextValue();
        seq.setNextValue(issued + 1);
        return issued; // D3 — issue, then increment
    }
}