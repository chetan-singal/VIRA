package com.vira.daybook;

import com.vira.bill.BillLineRequest;
import com.vira.bill.BillRequest;
import com.vira.bill.BillResponse;
import com.vira.bill.BillService;
import com.vira.bill.BillType;
import com.vira.common.FieldValidationException;
import com.vira.item.ItemRequest;
import com.vira.item.ItemService;
import com.vira.item.ItemType;
import com.vira.party.PartyRequest;
import com.vira.party.PartyResponse;
import com.vira.party.PartyService;
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
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@SpringBootTest
@ActiveProfiles("test")
@Transactional
class DaybookServiceTest {

    private static final LocalDate DAY = LocalDate.of(2020, 1, 15);

    @Autowired private DaybookService daybookService;
    @Autowired private BillService billService;
    @Autowired private ItemService itemService;
    @Autowired private PartyService partyService;
    @Autowired private PaymentVoucherService voucherService;

    private Long newItem(String name) {
        return itemService.create(new ItemRequest(name, "Pcs", null, null, ItemType.MRP,
                new BigDecimal("500.00"), new BigDecimal("10.00"), null)).id();
    }

    private PartyResponse newParty(String name) {
        return partyService.create(new PartyRequest(name, null, null, null, null, null, null));
    }

    private List<BillLineRequest> oneLine(Long itemId) {
        return List.of(new BillLineRequest(itemId, 1, new BigDecimal("500.00"), new BigDecimal("10.00"), null));
    }

    private BillResponse partyBill(Long partyId, Long itemId) {
        return billService.create(new BillRequest(BillType.PARTY, partyId, DAY, oneLine(itemId), null));
    }

    private BillResponse cashBill(Long itemId) {
        return billService.create(new BillRequest(BillType.CASH, null, DAY, oneLine(itemId), null));
    }

    @Test
    void summaryExcludesDeletedBillsButTheTableCanStillShowThem() {
        Long item = newItem("Daybook Brake Pad");
        PartyResponse party = newParty("Daybook Party");
        partyBill(party.id(), item);
        BillResponse gone = partyBill(party.id(), item);
        billService.delete(gone.id());

        PageRequest page = PageRequest.of(0, 20);
        DaybookResponse withDeleted =
                daybookService.query(new BillFilter(DAY, DAY, null, party.id(), null, true), page);
        DaybookResponse withoutDeleted =
                daybookService.query(new BillFilter(DAY, DAY, null, party.id(), null, false), page);

        assertThat(withDeleted.bills().content()).hasSize(2);
        assertThat(withoutDeleted.bills().content()).hasSize(1);
        assertThat(withDeleted.bills().content()).anySatisfy(row -> {
            assertThat(row.deleted()).isTrue();
            assertThat(row.actions().canRestore()).isTrue();
        });
        // the summary is identical whichever way the table is toggled
        assertThat(withDeleted.summary()).isEqualTo(withoutDeleted.summary());
        assertThat(withDeleted.summary().totalBills()).isEqualTo(1);
        assertThat(withDeleted.summary().totalSales()).isEqualByComparingTo("450.00");
        assertThat(withDeleted.summary().partySales()).isEqualByComparingTo("450.00");
        assertThat(withDeleted.summary().cashBillSales()).isEqualByComparingTo("0.00");
    }

    @Test
    void filtersByBillTypeAndItemNameKeyword() {
        Long item = newItem("Daybook Clutch Plate");
        PartyResponse party = newParty("Keyword Party");
        partyBill(party.id(), item);
        cashBill(item);

        PageRequest page = PageRequest.of(0, 20);
        DaybookResponse both = daybookService.query(
                new BillFilter(null, null, null, null, "daybook clutch", false), page);
        DaybookResponse partyOnly = daybookService.query(
                new BillFilter(null, null, BillType.PARTY, null, "daybook clutch", false), page);

        assertThat(both.summary().totalBills()).isEqualTo(2);
        assertThat(partyOnly.bills().content()).hasSize(1);
        assertThat(partyOnly.summary().partySales()).isEqualByComparingTo("450.00");
        assertThat(partyOnly.summary().cashBillSales()).isEqualByComparingTo("0.00");
    }

    @Test
    void rowsOfADeletedPartyAreLockedWithAReason() {
        Long item = newItem("Daybook Chain Set");
        PartyResponse party = newParty("Locked Party");
        partyBill(party.id(), item);
        voucherService.create(new PaymentVoucherRequest(
                party.id(), DAY, new BigDecimal("450.00"), PaymentMode.CASH, null, null));
        partyService.delete(party.id());

        DaybookResponse result = daybookService.query(
                new BillFilter(DAY, DAY, null, party.id(), null, false), PageRequest.of(0, 10));

        assertThat(result.bills().content()).hasSize(1);
        DaybookRow row = result.bills().content().get(0);
        assertThat(row.actions().canEdit()).isFalse();
        assertThat(row.actions().canDelete()).isFalse();
        assertThat(row.actions().blockedReason()).contains("Restore the party first");
    }

    @Test
    void aFromDateAfterTheToDateIsRejected() {
        assertThatThrownBy(() -> daybookService.query(
                new BillFilter(DAY.plusDays(1), DAY, null, null, null, false), PageRequest.of(0, 10)))
                .isInstanceOf(FieldValidationException.class);
    }
}