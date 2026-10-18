package com.vira.bill;

import com.vira.item.ItemRequest;
import com.vira.item.ItemResponse;
import com.vira.item.ItemService;
import com.vira.item.ItemType;
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

    private ItemResponse createMrpItem() {
        return itemService.create(new ItemRequest("Brake Pad", "Pcs", null, null,
                ItemType.MRP, new BigDecimal("500.00"), new BigDecimal("10.00"), null));
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
        BigDecimal before = cashInHandRepository.lockForUpdate().getBalance();

        BillResponse response = billService.create(new BillRequest(
                BillType.CASH, null, LocalDate.now(),
                List.of(new BillLineRequest(item.id(), 1, new BigDecimal("500.00"), new BigDecimal("10.00"), null)),
                null));

        BigDecimal after = cashInHandRepository.lockForUpdate().getBalance();
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
        BigDecimal before = cashInHandRepository.lockForUpdate().getBalance();

        assertThatThrownBy(() -> billService.create(new BillRequest(
                BillType.CASH, null, LocalDate.now(),
                List.of(new BillLineRequest(999999L, 1, null, null, new BigDecimal("100.00"))),
                null)));

        BigDecimal after = cashInHandRepository.lockForUpdate().getBalance();
        assertThat(after).isEqualByComparingTo(before);
    }
}