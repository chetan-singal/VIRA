package com.vira.supplier;

import com.vira.common.NotFoundException;
import com.vira.ledger.CashInHandRepository;
import com.vira.voucher.PaymentMode;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@SpringBootTest
@ActiveProfiles("test")
@Transactional
class SupplierSummaryServiceTest {

    @Autowired private SupplierSummaryService summaryService;
    @Autowired private SupplierService supplierService;
    @Autowired private SupplierPaymentService paymentService;
    @Autowired private CashInHandRepository cashInHandRepository;

    private SupplierResponse newSupplier(String name) {
        return supplierService.create(new SupplierRequest(name, null, null));
    }

    private SupplierPaymentResponse pay(Long supplierId, String amount) {
        return paymentService.create(new SupplierPaymentRequest(
                supplierId, LocalDate.now(), new BigDecimal(amount), PaymentMode.CASH, null, null));
    }

    @Test
    void overallFigures() {
        SupplierListSummary before = summaryService.overall();

        SupplierResponse a = newSupplier("Summary Supplier A");
        SupplierResponse b = newSupplier("Summary Supplier B");
        pay(a.id(), "100.00");
        pay(b.id(), "250.50");

        SupplierListSummary after = summaryService.overall();

        assertThat(after.totalSuppliers()).isEqualTo(before.totalSuppliers() + 2);
        assertThat(after.paymentCount()).isEqualTo(before.paymentCount() + 2);
        assertThat(after.paymentTotal().subtract(before.paymentTotal())).isEqualByComparingTo("350.50");
        assertThat(after.cashInHand())
                .isEqualByComparingTo(cashInHandRepository.findById(1L).orElseThrow().getBalance());
    }

    @Test
    void deletedPaymentsAreExcluded() {
        SupplierResponse supplier = newSupplier("Summary Deleted Payment Supplier");
        pay(supplier.id(), "40.00");
        SupplierPaymentResponse second = pay(supplier.id(), "80.00");
        SupplierListSummary before = summaryService.overall();

        paymentService.delete(second.id());

        SupplierListSummary after = summaryService.overall();
        assertThat(after.paymentCount()).isEqualTo(before.paymentCount() - 1);
        assertThat(before.paymentTotal().subtract(after.paymentTotal())).isEqualByComparingTo("80.00");
    }

    @Test
    void oneSupplier() {
        SupplierResponse supplier = newSupplier("Summary One Supplier");
        SupplierResponse other = newSupplier("Summary Other Supplier");
        pay(supplier.id(), "40.00");
        pay(supplier.id(), "60.25");
        SupplierPaymentResponse removed = pay(supplier.id(), "30.00");
        pay(other.id(), "500.00");
        paymentService.delete(removed.id());

        SupplierPaymentTotals totals = summaryService.forSupplier(supplier.id());

        assertThat(totals.paymentCount()).isEqualTo(2);
        assertThat(totals.paymentTotal()).isEqualByComparingTo("100.25");
    }

    @Test
    void unknownSupplierIsNotFound() {
        assertThatThrownBy(() -> summaryService.forSupplier(Long.MAX_VALUE))
                .isInstanceOf(NotFoundException.class);
    }
}