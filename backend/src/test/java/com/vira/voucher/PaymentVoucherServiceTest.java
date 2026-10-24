package com.vira.voucher;

import com.vira.common.BusinessRuleException;
import com.vira.common.PageResponse;
import com.vira.ledger.CashInHandRepository;
import com.vira.party.PartyRequest;
import com.vira.party.PartyResponse;
import com.vira.party.PartyService;

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
class PaymentVoucherServiceTest {

    @Autowired
    private PaymentVoucherService voucherService;

    @Autowired
    private PartyService partyService;

    @Autowired
    private CashInHandRepository cashInHandRepository;

    private PaymentVoucherRequest request(Long partyId, String amount, PaymentMode mode) {
        return new PaymentVoucherRequest(partyId, LocalDate.now(), new BigDecimal(amount), mode, null, null);
    }

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

    @Test
    void listHidesDeletedVouchersUnlessAskedAndTagsThem() {
        PartyResponse party = partyService.create(
                new PartyRequest("List Party", null, null, null, null, null, new BigDecimal("1000.00")));
        PaymentVoucherResponse kept = voucherService.create(request(party.id(), "100.00", PaymentMode.CASH));
        PaymentVoucherResponse gone = voucherService.create(request(party.id(), "200.00", PaymentMode.CASH));
        voucherService.delete(gone.id());

        PageRequest page = PageRequest.of(0, 10);
        assertThat(voucherService.list(null, null, party.id(), null, false, page).content())
                .extracting(PaymentVoucherResponse::id).containsExactly(kept.id());
        PageResponse<PaymentVoucherResponse> all = voucherService.list(null, null, party.id(), null, true, page);
        assertThat(all.content()).hasSize(2);
        assertThat(all.content()).anySatisfy(v -> {
            assertThat(v.deleted()).isTrue();
            assertThat(v.actions().canRestore()).isTrue();
        });
    }

    @Test
    void editingTheModeLeavesCashUnchanged() {
        PartyResponse party = partyService.create(
                new PartyRequest("Mode Party", null, null, null, null, null, new BigDecimal("1000.00")));
        PaymentVoucherResponse voucher = voucherService.create(request(party.id(), "300.00", PaymentMode.CASH));
        BigDecimal cashBefore = cashInHandRepository.lockForUpdate().getBalance();

        voucherService.edit(voucher.id(), request(party.id(), "300.00", PaymentMode.ONLINE));

        assertThat(cashInHandRepository.lockForUpdate().getBalance()).isEqualByComparingTo(cashBefore);
        assertThat(partyService.get(party.id()).currentBalance()).isEqualByComparingTo("700.00");
    }

    @Test
    void deleteRestoresThePartyBalanceAndRestoreReappliesTheVoucher() {
        PartyResponse party = partyService.create(
                new PartyRequest("Undo Party", null, null, null, null, null, new BigDecimal("1000.00")));
        PaymentVoucherResponse voucher = voucherService.create(request(party.id(), "300.00", PaymentMode.CASH));
        BigDecimal cashAfterCreate = cashInHandRepository.lockForUpdate().getBalance();

        voucherService.delete(voucher.id());
        assertThat(partyService.get(party.id()).currentBalance()).isEqualByComparingTo("1000.00");
        assertThat(cashAfterCreate.subtract(cashInHandRepository.lockForUpdate().getBalance()))
                .isEqualByComparingTo("300.00");

        voucherService.restore(voucher.id());
        assertThat(partyService.get(party.id()).currentBalance()).isEqualByComparingTo("700.00");
        assertThat(cashInHandRepository.lockForUpdate().getBalance()).isEqualByComparingTo(cashAfterCreate);
    }

    @Test
    void aDeletedVoucherCannotBeEdited() {
        PartyResponse party = partyService.create(
                new PartyRequest("Frozen Party", null, null, null, null, null, new BigDecimal("500.00")));
        PaymentVoucherResponse voucher = voucherService.create(request(party.id(), "100.00", PaymentMode.CASH));
        voucherService.delete(voucher.id());

        assertThatThrownBy(() -> voucherService.edit(voucher.id(), request(party.id(), "150.00", PaymentMode.CASH)))
                .isInstanceOf(BusinessRuleException.class)
                .satisfies(e -> assertThat(((BusinessRuleException) e).getCode()).isEqualTo("VOUCHER_DELETED"));
    }
}