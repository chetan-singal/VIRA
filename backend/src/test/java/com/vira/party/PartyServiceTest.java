package com.vira.party;

import com.vira.common.BusinessRuleException;
import com.vira.common.PageResponse;
import com.vira.voucher.PaymentMode;
import com.vira.voucher.PaymentVoucherRequest;
import com.vira.voucher.PaymentVoucherService;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.data.domain.PageRequest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@SpringBootTest
@ActiveProfiles("test")
@Transactional
class PartyServiceTest {

    @Autowired private PartyService partyService;
    @Autowired private PartyRepository partyRepository;
    @Autowired private PaymentVoucherService voucherService;

    @Test
    void createWithOpeningBalanceSeedsCurrentBalanceImmediately() {
        PartyResponse response = partyService.create(
                new PartyRequest("Ramesh Motors", null, null, null, null, null, new BigDecimal("500.00")));

        assertThat(response.currentBalance()).isEqualByComparingTo("500.00");
        assertThat(response.openingBalance()).isEqualByComparingTo("500.00");
    }

    @Test
    void createWithNoOpeningBalanceDefaultsToZero() {
        PartyResponse response = partyService.create(
                new PartyRequest("Suresh Spares", null, null, null, null, null, null));

        assertThat(response.openingBalance()).isEqualByComparingTo("0.00");
        assertThat(response.currentBalance()).isEqualByComparingTo("0.00");
    }

    @Test
    void listSearchesByPartialCaseInsensitiveName() {
        partyService.create(new PartyRequest("Krishna Auto Parts", null, null, null, null, null, null));
        partyService.create(new PartyRequest("Unrelated Traders", null, null, null, null, null, null));

        var page = partyService.list("krishna", PageRequest.of(0, 10));

        assertThat(page.content()).hasSize(1);
        assertThat(page.content().get(0).name()).isEqualTo("Krishna Auto Parts");
    }

    @Test
    void deleteAtNonZeroBalanceFailsThenZeroedBalanceSucceeds() {
        PartyResponse party = partyService.create(
                new PartyRequest("Delete Test Party", null, null, null, null, null, new BigDecimal("250.00")));

        assertThatThrownBy(() -> partyService.delete(party.id()))
                .isInstanceOf(BusinessRuleException.class)
                .satisfies(e -> assertThat(((BusinessRuleException) e).getCode()).isEqualTo("PARTY_BALANCE_NOT_ZERO"));

        voucherService.create(new PaymentVoucherRequest(
                party.id(), LocalDate.now(), new BigDecimal("250.00"), PaymentMode.CASH, null, null));

        partyService.delete(party.id());

        assertThat(partyRepository.findById(party.id()).orElseThrow().isDeleted()).isTrue();
    }

    @Test
    void restoreClearsDeletedFlag() {
        PartyResponse party = partyService.create(
                new PartyRequest("Restore Test Party", null, null, null, null, null, null));
        partyService.delete(party.id());

        partyService.restore(party.id());

        assertThat(partyRepository.findById(party.id()).orElseThrow().isDeleted()).isFalse();
    }

    @Test
    void deletedPartiesAppearOnlyInTheDeletedTab() {
        PartyResponse party = partyService.create(
                new PartyRequest("Tab Test Party", null, null, null, null, null, null));
        partyService.delete(party.id());

        assertThat(partyService.list("Tab Test", false, PageRequest.of(0, 10)).content()).isEmpty();
        PageResponse<PartyResponse> deleted = partyService.list("Tab Test", true, PageRequest.of(0, 10));
        assertThat(deleted.content()).hasSize(1);
        assertThat(deleted.content().get(0).deleted()).isTrue();
    }
}