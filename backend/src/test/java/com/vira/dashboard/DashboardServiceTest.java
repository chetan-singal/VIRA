package com.vira.dashboard;

import com.vira.bill.BillLineRequest;
import com.vira.bill.BillRequest;
import com.vira.bill.BillResponse;
import com.vira.bill.BillService;
import com.vira.bill.BillType;
import com.vira.common.FieldValidationException;
import com.vira.item.ItemRequest;
import com.vira.item.ItemService;
import com.vira.item.ItemType;

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
class DashboardServiceTest {

    @Autowired private DashboardService dashboardService;
    @Autowired private BillService billService;
    @Autowired private ItemService itemService;

    private BillResponse cashBill(Long itemId, LocalDate day) {
        return billService.create(new BillRequest(BillType.CASH, null, day,
                List.of(new BillLineRequest(itemId, 1, new BigDecimal("500.00"), new BigDecimal("10.00"), null)),
                null));
    }

    @Test
    void customPeriodExcludesDeletedBillsAndFillsEveryDay() {
        Long item = itemService.create(new ItemRequest("Dashboard Chain Set", "Pcs", null, null,
                ItemType.MRP, new BigDecimal("500.00"), new BigDecimal("10.00"), null)).id();
        LocalDate day = LocalDate.of(2020, 3, 10);
        cashBill(item, day);
        BillResponse gone = cashBill(item, day);
        billService.delete(gone.id());

        DashboardResponse d = dashboardService.dashboard(
                DashboardPeriod.CUSTOM, LocalDate.of(2020, 3, 1), LocalDate.of(2020, 3, 31), 5);

        assertThat(d.kpis().cashBillSales()).isEqualByComparingTo("450.00");
        assertThat(d.kpis().partySales()).isEqualByComparingTo("0.00");
        assertThat(d.kpis().totalSales()).isEqualByComparingTo("450.00");
        assertThat(d.trendGranularity()).isEqualTo("DAY");
        assertThat(d.salesTrend()).hasSize(31);
        assertThat(d.salesTrend().get(9).bucket()).isEqualTo("2020-03-10");
        assertThat(d.salesTrend().get(9).cashBillSales()).isEqualByComparingTo("450.00");
        assertThat(d.salesTrend().get(0).cashBillSales()).isEqualByComparingTo("0.00");
        assertThat(d.recentBills()).hasSizeLessThanOrEqualTo(5);
    }

    @Test
    void aLongCustomPeriodIsBucketedByMonth() {
        DashboardResponse d = dashboardService.dashboard(
                DashboardPeriod.CUSTOM, LocalDate.of(2019, 1, 1), LocalDate.of(2019, 12, 31), 5);

        assertThat(d.trendGranularity()).isEqualTo("MONTH");
        assertThat(d.salesTrend()).hasSize(12);
        assertThat(d.salesTrend().get(0).bucket()).isEqualTo("2019-01");
    }

    @Test
    void aCustomPeriodNeedsBothDates() {
        assertThatThrownBy(() -> dashboardService.dashboard(DashboardPeriod.CUSTOM, null, null, 5))
                .isInstanceOf(FieldValidationException.class);
    }
}