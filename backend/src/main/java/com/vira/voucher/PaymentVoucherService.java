package com.vira.voucher;

import com.vira.common.Money;
import com.vira.common.NotFoundException;
import com.vira.ledger.LedgerService;
import com.vira.ledger.NumberSequenceService;
import com.vira.party.Party;
import com.vira.party.PartyService;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class PaymentVoucherService {

    private final PaymentVoucherRepository vouchers;
    private final PartyService partyService;
    private final LedgerService ledger;
    private final NumberSequenceService numbers;

    public PaymentVoucherService(PaymentVoucherRepository vouchers, PartyService partyService,
                                  LedgerService ledger, NumberSequenceService numbers) {
        this.vouchers = vouchers;
        this.partyService = partyService;
        this.ledger = ledger;
        this.numbers = numbers;
    }

    @Transactional
    public PaymentVoucherResponse create(PaymentVoucherRequest r) {
        Party party = partyService.loadActive(r.partyId());

        PaymentVoucher v = new PaymentVoucher();
        v.setPartyId(party.getId());
        v.setPartyNameSnapshot(party.getName());
        v.setPaymentDate(r.paymentDate());
        v.setAmount(Money.round(r.amount()));
        v.setPaymentMode(r.paymentMode());
        v.setReferenceNo(r.referenceNo());
        v.setRemarks(r.remarks());
        v.setVoucherNo(String.valueOf(numbers.nextValue(NumberSequenceService.VOUCHER)));

        PaymentVoucher saved = vouchers.save(v);

        ledger.adjustPartyBalance(party.getId(), v.getAmount().negate());
        ledger.adjustCash(v.getAmount());

        return toResponse(saved);
    }

    PaymentVoucher find(Long id) {
        return vouchers.findById(id).orElseThrow(() -> new NotFoundException("Payment Voucher " + id + " not found"));
    }

    private PaymentVoucherResponse toResponse(PaymentVoucher v) {
        return new PaymentVoucherResponse(v.getId(), v.getVoucherNo(), v.getPartyId(), v.getPartyNameSnapshot(),
                v.getPaymentDate(), v.getAmount(), v.getPaymentMode(), v.getReferenceNo(), v.getRemarks(),
                v.isEdited(), v.getLastEditedAt(), v.isDeleted(), v.getDeletedAt());
    }
}