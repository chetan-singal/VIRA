package com.vira.maintenance;

import com.vira.party.PartyRequest;
import com.vira.party.PartyResponse;
import com.vira.party.PartyService;
import com.vira.voucher.PaymentMode;
import com.vira.voucher.PaymentVoucherRequest;
import com.vira.voucher.PaymentVoucherService;

import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@ActiveProfiles("test")
@Transactional
class RecalculateBalancesServiceTest {

    @Autowired private RecalculateBalancesService service;
    @Autowired private PartyService partyService;
    @Autowired private PaymentVoucherService voucherService;
    @Autowired private JdbcTemplate jdbc;
    @Autowired private EntityManager em;

    private RecalculateReport.PartyMismatch mismatchFor(RecalculateReport report, Long partyId) {
        return report.partyMismatches().stream()
                .filter(m -> m.partyId().equals(partyId)).findFirst().orElse(null);
    }

    @Test
    void consistentPartyIsNotReported() {
        PartyResponse party = partyService.create(
                new PartyRequest("Recalc Clean Party", null, null, null, null, null, new BigDecimal("100.00")));
        voucherService.create(new PaymentVoucherRequest(
                party.id(), LocalDate.now(), new BigDecimal("40.00"), PaymentMode.CASH, null, null));

        assertThat(mismatchFor(service.check(), party.id())).isNull();
    }

    @Test
    void corruptedPartyBalanceIsReportedAndCorrectedThroughLedger() {
        PartyResponse party = partyService.create(
                new PartyRequest("Recalc Party", null, null, null, null, null, new BigDecimal("100.00")));
        voucherService.create(new PaymentVoucherRequest(
                party.id(), LocalDate.now(), new BigDecimal("40.00"), PaymentMode.CASH, null, null));

        em.flush();
        jdbc.update("update party set current_balance = 999.00 where id = ?", party.id());
        em.clear();

        RecalculateReport.PartyMismatch m = mismatchFor(service.check(), party.id());
        assertThat(m).isNotNull();
        assertThat(m.stored()).isEqualByComparingTo("999.00");
        assertThat(m.expected()).isEqualByComparingTo("60.00");

        service.applyPartyCorrection(party.id());

        assertThat(partyService.get(party.id()).currentBalance()).isEqualByComparingTo("60.00");
        assertThat(mismatchFor(service.check(), party.id())).isNull();
    }

    @Test
    void corruptedCashIsReportedAndCorrectedThroughLedger() {
        RecalculateReport before = service.check();
        BigDecimal driftBefore = before.storedCash().subtract(before.expectedCash());

        em.flush();
        jdbc.update("update cash_in_hand set balance = balance + 100.00 where id = 1");
        em.clear();

        RecalculateReport after = service.check();
        BigDecimal driftAfter = after.storedCash().subtract(after.expectedCash());
        assertThat(driftAfter.subtract(driftBefore)).isEqualByComparingTo("100.00");

        RecalculateReport corrected = service.applyCashCorrection();

        assertThat(corrected.storedCash()).isEqualByComparingTo(corrected.expectedCash());
    }
}