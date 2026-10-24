package com.vira.voucher;

import com.vira.common.BusinessRuleException;
import com.vira.common.Money;
import com.vira.common.NotFoundException;
import com.vira.common.PageResponse;
import com.vira.common.RecordActions;
import com.vira.ledger.LedgerService;
import com.vira.ledger.NumberSequenceService;
import com.vira.party.Party;
import com.vira.party.PartyService;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Map;
import java.util.stream.Collectors;

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

    @Transactional
    public PaymentVoucherResponse edit(Long id, PaymentVoucherRequest r) {
        PaymentVoucher v = find(id);
        if (v.isDeleted()) {
            throw new BusinessRuleException("VOUCHER_DELETED", "This voucher is deleted. Restore it first.");
        }
        partyService.loadActive(v.getPartyId());

        ledger.adjustPartyBalance(v.getPartyId(), v.getAmount());
        ledger.adjustCash(v.getAmount().negate());

        Party newParty = partyService.loadActive(r.partyId());
        v.setPartyId(newParty.getId());
        v.setPartyNameSnapshot(newParty.getName());
        v.setPaymentDate(r.paymentDate());
        v.setAmount(Money.round(r.amount()));
        v.setPaymentMode(r.paymentMode());
        v.setReferenceNo(r.referenceNo());
        v.setRemarks(r.remarks());
        v.setEdited(true);
        v.setLastEditedAt(LocalDateTime.now());

        PaymentVoucher saved = vouchers.save(v);

        ledger.adjustPartyBalance(newParty.getId(), v.getAmount().negate());
        ledger.adjustCash(v.getAmount());

        return toResponse(saved);
    }

    @Transactional
    public void delete(Long id) {
        PaymentVoucher v = find(id);
        if (v.isDeleted()) {
            throw new BusinessRuleException("VOUCHER_ALREADY_DELETED", "This voucher is already deleted.");
        }
        partyService.loadActive(v.getPartyId());
        ledger.adjustPartyBalance(v.getPartyId(), v.getAmount());
        ledger.adjustCash(v.getAmount().negate());
        v.setDeleted(true);
        v.setDeletedAt(LocalDateTime.now());
    }

    @Transactional
    public PaymentVoucherResponse restore(Long id) {
        PaymentVoucher v = find(id);
        if (!v.isDeleted()) {
            throw new BusinessRuleException("VOUCHER_NOT_DELETED", "This voucher is not deleted.");
        }
        if (partyService.loadAny(v.getPartyId()).isDeleted()) {
            throw new BusinessRuleException("RESTORE_BLOCKED_PARTY_DELETED",
                    "This voucher's party is deleted. Restore the party first.");
        }
        ledger.adjustPartyBalance(v.getPartyId(), v.getAmount().negate());
        ledger.adjustCash(v.getAmount());
        v.setDeleted(false);
        v.setDeletedAt(null);
        return toResponse(v);
    }

    @Transactional(readOnly = true)
    public PaymentVoucherResponse get(Long id) {
        PaymentVoucher v = find(id);
        return toResponse(v, partyService.loadAny(v.getPartyId()).isDeleted());
    }

    @Transactional(readOnly = true)
    public PageResponse<PaymentVoucherResponse> list(LocalDate from, LocalDate to, Long partyId,
                                                     String keyword, boolean includeDeleted,
                                                     Pageable pageable) {
        Page<PaymentVoucher> page = vouchers.findAll(
                PaymentVoucherSpecifications.of(from, to, partyId, keyword, includeDeleted), pageable);
        Map<Long, Boolean> deleted = partyService.deletedFlags(
                page.getContent().stream().map(PaymentVoucher::getPartyId).collect(Collectors.toSet()));
        return PageResponse.of(page.map(v -> toResponse(v, deleted.getOrDefault(v.getPartyId(), false))));
    }

    PaymentVoucher find(Long id) {
        return vouchers.findById(id).orElseThrow(() -> new NotFoundException("Payment Voucher " + id + " not found"));
    }

    private PaymentVoucherResponse toResponse(PaymentVoucher v) {
        return toResponse(v, false);
    }

    private PaymentVoucherResponse toResponse(PaymentVoucher v, boolean partyDeleted) {
        return new PaymentVoucherResponse(v.getId(), v.getVoucherNo(), v.getPartyId(), v.getPartyNameSnapshot(),
                v.getPaymentDate(), v.getAmount(), v.getPaymentMode(), v.getReferenceNo(), v.getRemarks(),
                v.isEdited(), v.getLastEditedAt(), v.isDeleted(), v.getDeletedAt(),
                RecordActions.of(v.isDeleted(), partyDeleted, "party"));
    }
}