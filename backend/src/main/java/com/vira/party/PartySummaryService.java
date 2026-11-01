package com.vira.party;

import com.vira.bill.BillRepository;
import com.vira.common.Money;
import com.vira.common.NotFoundException;
import com.vira.voucher.PaymentVoucherRepository;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;

@Service
public class PartySummaryService {

    private final PartyRepository parties;
    private final BillRepository bills;
    private final PaymentVoucherRepository vouchers;

    public PartySummaryService(PartyRepository parties, BillRepository bills,
                               PaymentVoucherRepository vouchers) {
        this.parties = parties;
        this.bills = bills;
        this.vouchers = vouchers;
    }

    @Transactional(readOnly = true)
    public PartyBalanceSummary summary(Long partyId) {
        Party p = parties.findById(partyId)
                .orElseThrow(() -> new NotFoundException("Party " + partyId + " not found"));
        return new PartyBalanceSummary(p.getOpeningBalance(),
                nz(bills.sumGrandTotalForPartyActive(partyId)),
                nz(vouchers.sumByPartyActive(partyId)),
                p.getCurrentBalance());
    }

    /** Figures for the Parties list tiles: active parties only, from stored balances. */
    @Transactional(readOnly = true)
    public PartyListSummary overall() {
        return new PartyListSummary(
                parties.countActive(),
                parties.countActiveWithBalance(),
                Money.round(nz(parties.sumActiveOutstanding())),
                Money.round(nz(parties.sumActiveAdvance()).negate()));
    }

    private static BigDecimal nz(BigDecimal v) {
        return v == null ? BigDecimal.ZERO : v;
    }
}