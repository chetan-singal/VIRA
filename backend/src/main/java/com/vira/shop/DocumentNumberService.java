package com.vira.shop;

import com.vira.ledger.NumberSequenceService;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.function.Function;

/** Issues document numbers as prefix + number (D9). No profile or a blank prefix gives the bare number. */
@Service
public class DocumentNumberService {

    private final NumberSequenceService numbers;
    private final ShopProfileRepository profiles;

    public DocumentNumberService(NumberSequenceService numbers, ShopProfileRepository profiles) {
        this.numbers = numbers;
        this.profiles = profiles;
    }

    @Transactional
    public String nextCashBillNo() {
        return prefixed(ShopProfile::getCashBillPrefix, NumberSequenceService.BILL);
    }

    @Transactional
    public String nextPartyBillNo() {
        return prefixed(ShopProfile::getPartyBillPrefix, NumberSequenceService.BILL);
    }

    @Transactional
    public String nextVoucherNo() {
        return prefixed(ShopProfile::getVoucherPrefix, NumberSequenceService.VOUCHER);
    }

    @Transactional
    public String nextSupplierPaymentNo() {
        return prefixed(ShopProfile::getSupplierPaymentPrefix, NumberSequenceService.SUPPLIER_PAYMENT);
    }

    private String prefixed(Function<ShopProfile, String> prefixOf, String sequence) {
        String prefix = profiles.findById(1L).map(prefixOf).orElse("");
        return prefix + numbers.nextValue(sequence);
    }
}