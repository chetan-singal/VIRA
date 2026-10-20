package com.vira.voucher;

import com.vira.ledger.CashInHandRepository;
import com.vira.party.PartyRequest;
import com.vira.party.PartyResponse;
import com.vira.party.PartyService;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@ActiveProfiles("test")
@Transactional
class PaymentVoucherServiceTest {

    @Autowired
    private PaymentVoucherService voucherService;

    @Autowired
    private PartyService partyService;

    @Autowired
    private CashInHandRepository cashInHandRepository;

    @Test
    void createReducesPartyBalanceAndIncreasesCash() {
        PartyResponse party = partyService.create(
                new PartyRequest("Voucher Test Party", null, null, null, null, null, new BigDecimal("1000.00")));
        BigDecimal cashBefore = cashInHandRepository.lockForUpdate().getBalance();

        PaymentVoucherResponse voucher = voucherService.create(new PaymentVoucherRequest(
                party.id(), LocalDate.now(), new BigDecimal("300.00"), PaymentMode.CASH, null, null));

        BigDecimal cashAfter = cashInHandRepository.lockForUpdate().getBalance();
        PartyResponse partyAfter = partyService.get(party.id());

        assertThat(voucher.amount()).isEqualByComparingTo("300.00");
        assertThat(cashAfter.subtract(cashBefore)).isEqualByComparingTo("300.00");
        assertThat(partyAfter.currentBalance()).isEqualByComparingTo("700.00");
    }
}