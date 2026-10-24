package com.vira.bill;

import com.vira.common.BusinessRuleException;
import com.vira.item.ItemRequest;
import com.vira.item.ItemResponse;
import com.vira.item.ItemService;
import com.vira.item.ItemType;
import com.vira.ledger.CashInHandRepository;
import com.vira.party.PartyRequest;
import com.vira.party.PartyResponse;
import com.vira.party.PartyService;
import com.vira.voucher.PaymentMode;
import com.vira.voucher.PaymentVoucherRequest;
import com.vira.voucher.PaymentVoucherService;

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
class BillServiceTest {

    @Autowired private BillService billService;
    @Autowired private ItemService itemService;
    @Autowired private PartyService partyService;
    @Autowired private CashInHandRepository cashInHandRepository;
    @Autowired private PaymentVoucherService voucherService;

    private ItemResponse createMrpItem() {
        return itemService.create(new ItemRequest("Brake Pad", "Pcs", null, null,
                ItemType.MRP, new BigDecimal("500.00"), new BigDecimal("10.00"), null));
    }

    private BillRequest cashRequest(Long itemId, int qty) {
        return new BillRequest(BillType.CASH, null, LocalDate.now(),
                List.of(new BillLineRequest(itemId, qty, new BigDecimal("500.00"), new BigDecimal("10.00"), null)),
                null);
    }

    private BillRequest partyRequest(Long partyId, Long itemId, int qty) {
        return new BillRequest(BillType.PARTY, partyId, LocalDate.now(),
                List.of(new BillLineRequest(itemId, qty, new BigDecimal("500.00"), new BigDecimal("10.00"), null)),
                null);
    }

    private BigDecimal cash() {
        return cashInHandRepository.lockForUpdate().getBalance();
    }

    @Test
    void singleLineCashBillMatchesMrpRate() {
        ItemResponse item = createMrpItem();

        BillResponse response = billService.create(new BillRequest(
                BillType.CASH, null, LocalDate.now(),
                List.of(new BillLineRequest(item.id(), 2, new BigDecimal("500.00"), new BigDecimal("10.00"), null)),
                null));

        assertThat(response.lines().get(0).rate()).isEqualByComparingTo("450.00");
        assertThat(response.grandTotal()).isEqualByComparingTo("900.00");
    }

    @Test
    void cashBillIncreasesCashInHandByGrandTotal() {
        ItemResponse item = createMrpItem();
        BigDecimal before = cash();

        BillResponse response = billService.create(new BillRequest(
                BillType.CASH, null, LocalDate.now(),
                List.of(new BillLineRequest(item.id(), 1, new BigDecimal("500.00"), new BigDecimal("10.00"), null)),
                null));

        BigDecimal after = cash();
        assertThat(after.subtract(before)).isEqualByComparingTo(response.grandTotal());
    }

    @Test
    void partyBillIncreasesPartyBalanceAndReturnsPreviousBalanceAndTotalDue() {
        ItemResponse item = createMrpItem();
        PartyResponse party = partyService.create(
                new PartyRequest("Ramesh Motors", null, null, null, null, null, new BigDecimal("200.00")));

        BillResponse response = billService.create(new BillRequest(
                BillType.PARTY, party.id(), LocalDate.now(),
                List.of(new BillLineRequest(item.id(), 1, new BigDecimal("500.00"), new BigDecimal("10.00"), null)),
                null));

        assertThat(response.previousBalance()).isEqualByComparingTo("200.00");
        assertThat(response.totalDue()).isEqualByComparingTo("650.00");
        assertThat(partyService.get(party.id()).currentBalance()).isEqualByComparingTo("650.00");
    }

    @Test
    void automaticRoundOffRoundsToNearestRupee() {
        ItemResponse item = itemService.create(new ItemRequest("Spark Plug", "Pcs", null, null,
                ItemType.NET_RATE, null, null, new BigDecimal("923.40")));

        BillResponse response = billService.create(new BillRequest(
                BillType.CASH, null, LocalDate.now(),
                List.of(new BillLineRequest(item.id(), 1, null, null, new BigDecimal("923.40"))),
                null));

        assertThat(response.netAmount()).isEqualByComparingTo("923.40");
        assertThat(response.roundOff()).isEqualByComparingTo("-0.40");
        assertThat(response.grandTotal()).isEqualByComparingTo("923.00");
    }

    @Test
    void manualRoundOffOverrideIsUsedAsSubmitted() {
        ItemResponse item = createMrpItem();

        BillResponse response = billService.create(new BillRequest(
                BillType.CASH, null, LocalDate.now(),
                List.of(new BillLineRequest(item.id(), 1, new BigDecimal("500.00"), new BigDecimal("10.00"), null)),
                new BigDecimal("5.00")));

        assertThat(response.roundOff()).isEqualByComparingTo("5.00");
        assertThat(response.grandTotal()).isEqualByComparingTo("455.00");
    }

    @Test
    void badLineRollsBackWholeBillWithNoLedgerMovement() {
        BigDecimal before = cash();

        assertThatThrownBy(() -> billService.create(new BillRequest(
                BillType.CASH, null, LocalDate.now(),
                List.of(new BillLineRequest(999999L, 1, null, null, new BigDecimal("100.00"))),
                null)));

        BigDecimal after = cash();
        assertThat(after).isEqualByComparingTo(before);
    }

    @Test
    void readBackReturnsTheSamePreviousBalanceAndTotalDue() {
        ItemResponse item = createMrpItem();
        PartyResponse party = partyService.create(
                new PartyRequest("Readback Party", null, null, null, null, null, new BigDecimal("200.00")));

        BillResponse created = billService.create(partyRequest(party.id(), item.id(), 1));
        BillResponse read = billService.get(created.id());

        assertThat(read.previousBalance()).isEqualByComparingTo("200.00");
        assertThat(read.totalDue()).isEqualByComparingTo("650.00");
        assertThat(read.totalDue()).isEqualByComparingTo(created.totalDue());
    }

    @Test
    void editingQuantityMovesCashByTheDifference() {
        ItemResponse item = createMrpItem();
        BillResponse bill = billService.create(cashRequest(item.id(), 1));
        BigDecimal before = cash();

        BillResponse edited = billService.edit(bill.id(), cashRequest(item.id(), 3));

        assertThat(cash().subtract(before)).isEqualByComparingTo("900.00");
        assertThat(edited.edited()).isTrue();
        assertThat(edited.billNo()).isEqualTo(bill.billNo());
    }

    @Test
    void editingACashBillIntoAPartyBillMovesTheMoney() {
        ItemResponse item = createMrpItem();
        PartyResponse party = partyService.create(
                new PartyRequest("Switch Party", null, null, null, null, null, null));
        BillResponse bill = billService.create(cashRequest(item.id(), 1));
        BigDecimal cashBefore = cash();

        BillResponse edited = billService.edit(bill.id(), partyRequest(party.id(), item.id(), 1));

        assertThat(cash().subtract(cashBefore)).isEqualByComparingTo("-450.00");
        assertThat(partyService.get(party.id()).currentBalance()).isEqualByComparingTo("450.00");
        assertThat(edited.previousBalance()).isEqualByComparingTo("0.00");
        assertThat(edited.billNo()).isEqualTo(bill.billNo());
    }

    @Test
    void deleteReversesTheBillAndRestoreAppliesItAgain() {
        ItemResponse item = createMrpItem();
        BillResponse bill = billService.create(cashRequest(item.id(), 1));
        BigDecimal before = cash();

        billService.delete(bill.id());
        assertThat(before.subtract(cash())).isEqualByComparingTo("450.00");
        BillResponse deleted = billService.get(bill.id());
        assertThat(deleted.deleted()).isTrue();
        assertThat(deleted.actions().canRestore()).isTrue();
        assertThat(deleted.lines()).hasSize(1);

        billService.restore(bill.id());
        assertThat(cash()).isEqualByComparingTo(before);
        assertThat(billService.get(bill.id()).deleted()).isFalse();
    }

    @Test
    void aDeletedBillCannotBeEdited() {
        ItemResponse item = createMrpItem();
        BillResponse bill = billService.create(cashRequest(item.id(), 1));
        billService.delete(bill.id());

        assertThatThrownBy(() -> billService.edit(bill.id(), cashRequest(item.id(), 2)))
                .isInstanceOf(BusinessRuleException.class)
                .satisfies(e -> assertThat(((BusinessRuleException) e).getCode()).isEqualTo("BILL_DELETED"));
    }

    @Test
    void aDeletedPartyLocksItsBillsUntilItIsRestored() {
        ItemResponse item = createMrpItem();
        PartyResponse party = partyService.create(
                new PartyRequest("Lock Party", null, null, null, null, null, null));
        BillResponse bill = billService.create(partyRequest(party.id(), item.id(), 1));
        voucherService.create(new PaymentVoucherRequest(
                party.id(), LocalDate.now(), new BigDecimal("450.00"), PaymentMode.CASH, null, null));
        partyService.delete(party.id());

        assertThatThrownBy(() -> billService.edit(bill.id(), partyRequest(party.id(), item.id(), 2)))
                .isInstanceOf(BusinessRuleException.class)
                .satisfies(e -> assertThat(((BusinessRuleException) e).getCode()).isEqualTo("PARTY_INACTIVE"));
        assertThat(billService.get(bill.id()).actions().canEdit()).isFalse();
        assertThat(billService.get(bill.id()).actions().blockedReason()).contains("Restore the party first");

        partyService.restore(party.id());
        assertThat(billService.get(bill.id()).actions().canEdit()).isTrue();
    }
}