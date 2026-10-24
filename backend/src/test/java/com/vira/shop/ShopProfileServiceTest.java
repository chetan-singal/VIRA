package com.vira.shop;

import com.vira.bill.BillLineRequest;
import com.vira.bill.BillRequest;
import com.vira.bill.BillResponse;
import com.vira.bill.BillService;
import com.vira.bill.BillType;
import com.vira.common.BusinessRuleException;
import com.vira.item.ItemRequest;
import com.vira.item.ItemService;
import com.vira.item.ItemType;
import com.vira.ledger.CashInHandRepository;
import com.vira.maintenance.RecalculateBalancesService;
import com.vira.maintenance.RecalculateReport;
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
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@SpringBootTest
@ActiveProfiles("test")
@Transactional
class ShopProfileServiceTest {

    @Autowired private ShopProfileService shopProfileService;
    @Autowired private BillService billService;
    @Autowired private ItemService itemService;
    @Autowired private PartyService partyService;
    @Autowired private CashInHandRepository cashInHandRepository;
    @Autowired private RecalculateBalancesService recalculateBalancesService;

    private ShopProfileRequest profile(String cashPrefix, String partyPrefix, int start, String openingCash) {
        return new ShopProfileRequest("Chirag Auto Parts", null, null, null, null, null, null, null, null,
                cashPrefix, partyPrefix, "PV-", "SP-", start, new BigDecimal(openingCash),
                LocalDate.of(2026, 4, 1), true, true, true, true, true, true, null);
    }

    private Long newItem(String name) {
        return itemService.create(new ItemRequest(name, "Pcs", null, null, ItemType.MRP,
                new BigDecimal("500.00"), new BigDecimal("10.00"), null)).id();
    }

    private List<BillLineRequest> oneLine(Long itemId) {
        return List.of(new BillLineRequest(itemId, 1, new BigDecimal("500.00"), new BigDecimal("10.00"), null));
    }

    private BillResponse cashBill(Long itemId) {
        return billService.create(new BillRequest(BillType.CASH, null, LocalDate.now(), oneLine(itemId), null));
    }

    private void assertCode(Runnable call, String code) {
        assertThatThrownBy(call::run)
                .isInstanceOf(BusinessRuleException.class)
                .satisfies(e -> assertThat(((BusinessRuleException) e).getCode()).isEqualTo(code));
    }

    @Test
    void statusIsFalseBeforeSetupAndTrueAfter() {
        assertThat(shopProfileService.isSetupComplete()).isFalse();
        shopProfileService.setup(profile("C-", "P-", 1, "0.00"));
        assertThat(shopProfileService.isSetupComplete()).isTrue();
    }

    @Test
    void setupSeedsOpeningCashAndTheBillCounterAndPrefixesApply() {
        shopProfileService.setup(profile("C-", "P-", 1001, "5000.00"));
        assertThat(cashInHandRepository.lockForUpdate().getBalance()).isEqualByComparingTo("5000.00");

        Long item = newItem("Setup Pad");
        PartyResponse party = partyService.create(
                new PartyRequest("Setup Party", null, null, null, null, null, null));
        BillResponse cash = cashBill(item);
        BillResponse partyBill = billService.create(
                new BillRequest(BillType.PARTY, party.id(), LocalDate.now(), oneLine(item), null));

        assertThat(cash.billNo()).isEqualTo("C-1001");
        assertThat(partyBill.billNo()).isEqualTo("P-1002");
    }

    @Test
    void setupCannotRunTwice() {
        shopProfileService.setup(profile("C-", "P-", 1, "0.00"));
        assertCode(() -> shopProfileService.setup(profile("C-", "P-", 1, "0.00")), "SETUP_ALREADY_DONE");
    }

    @Test
    void startingValuesLockOnceARecordExistsButPrefixesStayEditable() {
        shopProfileService.setup(profile("C-", "P-", 1001, "5000.00"));
        cashBill(newItem("Lock Pad"));

        assertCode(() -> shopProfileService.update(profile("C-", "P-", 2000, "5000.00")), "SETUP_VALUES_LOCKED");
        assertCode(() -> shopProfileService.update(profile("C-", "P-", 1001, "6000.00")), "SETUP_VALUES_LOCKED");

        ShopProfileResponse changed = shopProfileService.update(profile("CB-", "PB-", 1001, "5000.00"));
        assertThat(changed.cashBillPrefix()).isEqualTo("CB-");
        assertThat(changed.setupValuesLocked()).isTrue();
    }

    @Test
    void openingCashAndCounterCanChangeBeforeAnyRecordExists() {
        shopProfileService.setup(profile("C-", "P-", 1001, "5000.00"));
        shopProfileService.update(profile("C-", "P-", 2000, "7500.00"));

        assertThat(cashInHandRepository.lockForUpdate().getBalance()).isEqualByComparingTo("7500.00");
        assertThat(cashBill(newItem("Reseed Pad")).billNo()).isEqualTo("C-2000");
    }

    @Test
    void recalculateBalancesCountsTheOpeningCash() {
        shopProfileService.setup(profile("C-", "P-", 1, "5000.00"));
        cashBill(newItem("Recalc Pad"));

        RecalculateReport report = recalculateBalancesService.check();

        assertThat(report.expectedCash()).isEqualByComparingTo(report.storedCash());
    }
}