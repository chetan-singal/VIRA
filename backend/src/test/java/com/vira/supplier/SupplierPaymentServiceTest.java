package com.vira.supplier;

import com.vira.common.BusinessRuleException;
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
class SupplierPaymentServiceTest {

    @Autowired
    private SupplierPaymentService supplierPaymentService;

    @Autowired
    private SupplierService supplierService;

    @Autowired
    private CashInHandRepository cashInHandRepository;

    private BigDecimal cash() {
        return cashInHandRepository.lockForUpdate().getBalance();
    }

    private SupplierPaymentRequest request(Long supplierId, String amount, PaymentMode mode) {
        return new SupplierPaymentRequest(supplierId, LocalDate.now(), new BigDecimal(amount), mode, null, null);
    }

    private SupplierResponse newSupplier(String name) {
        return supplierService.create(new SupplierRequest(name, null, null));
    }

    @Test
    void createReducesCashInHandOnly() {
        SupplierResponse supplier = newSupplier("Payment Test Supplier");
        BigDecimal cashBefore = cash();

        SupplierPaymentResponse payment = supplierPaymentService.create(
                request(supplier.id(), "150.00", PaymentMode.CASH));

        assertThat(payment.amount()).isEqualByComparingTo("150.00");
        assertThat(cash().subtract(cashBefore)).isEqualByComparingTo("-150.00");
    }

    @Test
    void editAmountMovesCashByTheDelta() {
        SupplierResponse supplier = newSupplier("Edit Amount Supplier");
        SupplierPaymentResponse payment = supplierPaymentService.create(
                request(supplier.id(), "150.00", PaymentMode.CASH));
        BigDecimal cashBefore = cash();

        SupplierPaymentResponse edited = supplierPaymentService.edit(
                payment.id(), request(supplier.id(), "200.00", PaymentMode.CASH));

        assertThat(cash().subtract(cashBefore)).isEqualByComparingTo("-50.00");
        assertThat(edited.edited()).isTrue();
        assertThat(edited.lastEditedAt()).isNotNull();
        assertThat(edited.paymentNo()).isEqualTo(payment.paymentNo());
    }

    @Test
    void editModeOnlineToCashLeavesCashUnchanged() {
        SupplierResponse supplier = newSupplier("Edit Mode Supplier");
        SupplierPaymentResponse payment = supplierPaymentService.create(
                request(supplier.id(), "150.00", PaymentMode.ONLINE));
        BigDecimal cashBefore = cash();

        supplierPaymentService.edit(payment.id(), request(supplier.id(), "150.00", PaymentMode.CASH));

        assertThat(cash().subtract(cashBefore)).isEqualByComparingTo("0.00");
    }

    @Test
    void editToAnotherSupplierUpdatesSnapshotAndKeepsCashCorrect() {
        SupplierResponse first = newSupplier("First Supplier");
        SupplierResponse second = newSupplier("Second Supplier");
        SupplierPaymentResponse payment = supplierPaymentService.create(
                request(first.id(), "150.00", PaymentMode.CASH));
        BigDecimal cashBefore = cash();

        SupplierPaymentResponse edited = supplierPaymentService.edit(
                payment.id(), request(second.id(), "150.00", PaymentMode.CASH));

        assertThat(edited.supplierId()).isEqualTo(second.id());
        assertThat(edited.supplierName()).isEqualTo("Second Supplier");
        assertThat(cash().subtract(cashBefore)).isEqualByComparingTo("0.00");
    }

    @Test
    void deleteRaisesCashBackAndRestoreLowersItAgain() {
        SupplierResponse supplier = newSupplier("Delete Restore Supplier");
        BigDecimal cashStart = cash();
        SupplierPaymentResponse payment = supplierPaymentService.create(
                request(supplier.id(), "150.00", PaymentMode.CASH));

        supplierPaymentService.delete(payment.id());
        assertThat(cash().subtract(cashStart)).isEqualByComparingTo("0.00");

        SupplierPaymentResponse restored = supplierPaymentService.restore(payment.id());
        assertThat(cash().subtract(cashStart)).isEqualByComparingTo("-150.00");
        assertThat(restored.deleted()).isFalse();
        assertThat(restored.paymentNo()).isEqualTo(payment.paymentNo());
    }

    @Test
    void editOrDeleteOfADeletedPaymentIsRejected() {
        SupplierResponse supplier = newSupplier("Deleted Payment Supplier");
        SupplierPaymentResponse payment = supplierPaymentService.create(
                request(supplier.id(), "150.00", PaymentMode.CASH));
        supplierPaymentService.delete(payment.id());

        assertThatThrownBy(() -> supplierPaymentService.edit(
                payment.id(), request(supplier.id(), "100.00", PaymentMode.CASH)))
                .isInstanceOfSatisfying(BusinessRuleException.class,
                        e -> assertThat(e.getCode()).isEqualTo("PAYMENT_DELETED"));
        assertThatThrownBy(() -> supplierPaymentService.delete(payment.id()))
                .isInstanceOfSatisfying(BusinessRuleException.class,
                        e -> assertThat(e.getCode()).isEqualTo("PAYMENT_ALREADY_DELETED"));
    }

    @Test
    void restoreOfANonDeletedPaymentIsRejected() {
        SupplierResponse supplier = newSupplier("Not Deleted Supplier");
        SupplierPaymentResponse payment = supplierPaymentService.create(
                request(supplier.id(), "150.00", PaymentMode.CASH));

        assertThatThrownBy(() -> supplierPaymentService.restore(payment.id()))
                .isInstanceOfSatisfying(BusinessRuleException.class,
                        e -> assertThat(e.getCode()).isEqualTo("PAYMENT_NOT_DELETED"));
    }

    @Test
    void deletedSupplierLocksItsPaymentsUntilSupplierIsRestored() {
        SupplierResponse supplier = newSupplier("Locked Supplier");
        BigDecimal cashStart = cash();
        SupplierPaymentResponse active = supplierPaymentService.create(
                request(supplier.id(), "150.00", PaymentMode.CASH));
        SupplierPaymentResponse toRestore = supplierPaymentService.create(
                request(supplier.id(), "75.00", PaymentMode.CASH));
        supplierPaymentService.delete(toRestore.id());

        supplierService.delete(supplier.id());

        assertThatThrownBy(() -> supplierPaymentService.edit(
                active.id(), request(supplier.id(), "100.00", PaymentMode.CASH)))
                .isInstanceOfSatisfying(BusinessRuleException.class,
                        e -> assertThat(e.getCode()).isEqualTo("SUPPLIER_INACTIVE"));
        assertThatThrownBy(() -> supplierPaymentService.delete(active.id()))
                .isInstanceOfSatisfying(BusinessRuleException.class,
                        e -> assertThat(e.getCode()).isEqualTo("SUPPLIER_INACTIVE"));
        assertThatThrownBy(() -> supplierPaymentService.restore(toRestore.id()))
                .isInstanceOfSatisfying(BusinessRuleException.class,
                        e -> assertThat(e.getCode()).isEqualTo("RESTORE_BLOCKED_SUPPLIER_DELETED"));

        supplierService.restore(supplier.id());

        supplierPaymentService.restore(toRestore.id());
        assertThat(cash().subtract(cashStart)).isEqualByComparingTo("-225.00");
    }
}