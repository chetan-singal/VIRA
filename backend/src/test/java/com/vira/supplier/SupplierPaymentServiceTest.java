package com.vira.supplier;

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

@SpringBootTest
@ActiveProfiles("test")
@Transactional
class SupplierPaymentServiceTest {

    @Autowired
    private SupplierPaymentService supplierPaymentService;

    @Autowired
    private SupplierService supplierService;

    @Autowired
    private CashInHandRepository cashInHandRepository;

    @Test
    void createReducesCashInHandOnly() {
        SupplierResponse supplier = supplierService.create(new SupplierRequest("Payment Test Supplier", null, null));
        BigDecimal cashBefore = cashInHandRepository.lockForUpdate().getBalance();

        SupplierPaymentResponse payment = supplierPaymentService.create(new SupplierPaymentRequest(
                supplier.id(), LocalDate.now(), new BigDecimal("150.00"), PaymentMode.CASH, null, null));

        BigDecimal cashAfter = cashInHandRepository.lockForUpdate().getBalance();

        assertThat(payment.amount()).isEqualByComparingTo("150.00");
        assertThat(cashAfter.subtract(cashBefore)).isEqualByComparingTo("-150.00");
    }
}