package com.vira.shop;

import com.vira.bill.BillRepository;
import com.vira.common.BusinessRuleException;
import com.vira.common.Money;
import com.vira.common.NotFoundException;
import com.vira.ledger.CashInHandRepository;
import com.vira.ledger.LedgerService;
import com.vira.ledger.NumberSequenceService;
import com.vira.supplier.SupplierPaymentRepository;
import com.vira.voucher.PaymentVoucherRepository;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.Objects;

@Service
public class ShopProfileService {

    private static final Long ID = 1L;

    private final ShopProfileRepository profiles;
    private final BillRepository bills;
    private final PaymentVoucherRepository vouchers;
    private final SupplierPaymentRepository supplierPayments;
    private final CashInHandRepository cashInHand;
    private final LedgerService ledger;
    private final NumberSequenceService numbers;

    public ShopProfileService(ShopProfileRepository profiles, BillRepository bills,
                              PaymentVoucherRepository vouchers, SupplierPaymentRepository supplierPayments,
                              CashInHandRepository cashInHand, LedgerService ledger,
                              NumberSequenceService numbers) {
        this.profiles = profiles;
        this.bills = bills;
        this.vouchers = vouchers;
        this.supplierPayments = supplierPayments;
        this.cashInHand = cashInHand;
        this.ledger = ledger;
        this.numbers = numbers;
    }

    @Transactional(readOnly = true)
    public boolean isSetupComplete() {
        return profiles.existsById(ID);
    }

    @Transactional(readOnly = true)
    public ShopProfileResponse get() {
        return ShopProfileResponse.from(load(), recordsExist());
    }

    @Transactional
    public ShopProfileResponse setup(ShopProfileRequest r) {
        if (profiles.existsById(ID)) {
            throw new BusinessRuleException("SETUP_ALREADY_DONE", "First-run setup has already been completed.");
        }
        if (recordsExist()) {
            throw new BusinessRuleException("SETUP_AFTER_TRANSACTIONS",
                    "Bills, vouchers or payments already exist, so the starting values can no longer be set.");
        }
        ShopProfile p = new ShopProfile();
        p.setId(ID);
        apply(p, r);
        p.setStartingBillNumber(r.startingBillNumber());
        p.setOpeningCashInHand(Money.round(r.openingCashInHand()));
        p.setOpeningCashInHandDate(r.openingCashInHandDate());
        profiles.save(p);

        numbers.seed(NumberSequenceService.BILL, r.startingBillNumber());
        setCashTo(p.getOpeningCashInHand());
        return ShopProfileResponse.from(p, false);
    }

    @Transactional
    public ShopProfileResponse update(ShopProfileRequest r) {
        ShopProfile p = load();
        boolean locked = recordsExist();
        BigDecimal opening = Money.round(r.openingCashInHand());

        boolean startChanged = !Objects.equals(p.getStartingBillNumber(), r.startingBillNumber());
        boolean cashChanged = p.getOpeningCashInHand() == null
                || p.getOpeningCashInHand().compareTo(opening) != 0
                || !Objects.equals(p.getOpeningCashInHandDate(), r.openingCashInHandDate());
        if (locked && (startChanged || cashChanged)) {
            throw new BusinessRuleException("SETUP_VALUES_LOCKED",
                    "Starting Bill Number and Opening Cash in Hand cannot be changed once any bill, "
                            + "voucher or payment exists.");
        }

        apply(p, r);
        if (startChanged) {
            p.setStartingBillNumber(r.startingBillNumber());
            numbers.seed(NumberSequenceService.BILL, r.startingBillNumber());
        }
        if (cashChanged) {
            p.setOpeningCashInHand(opening);
            p.setOpeningCashInHandDate(r.openingCashInHandDate());
            setCashTo(opening);
        }
        return ShopProfileResponse.from(p, locked);
    }

    private void apply(ShopProfile p, ShopProfileRequest r) {
        p.setShopName(r.shopName().trim());
        p.setAddress(r.address());
        p.setPhone(r.phone());
        p.setAlternatePhone(r.alternatePhone());
        p.setEmail(r.email());
        p.setCity(r.city());
        p.setState(r.state());
        p.setPinCode(r.pinCode());
        p.setNotes(r.notes());
        p.setCashBillPrefix(r.cashBillPrefix());
        p.setPartyBillPrefix(r.partyBillPrefix());
        p.setVoucherPrefix(r.voucherPrefix());
        p.setSupplierPaymentPrefix(r.supplierPaymentPrefix());
        p.setPrintShowShopName(r.printShowShopName());
        p.setPrintShowAddress(r.printShowAddress());
        p.setPrintShowPhone(r.printShowPhone());
        p.setPrintShowLogo(r.printShowLogo());
        p.setPrintShowThankyou(r.printShowThankyou());
        p.setPrintShowMrp(r.printShowMrp());
        p.setPrintTermsConditions(r.printTermsConditions());
    }

    /** Moves Cash in Hand to exactly the opening figure — through LedgerService, the only writer. */
    private void setCashTo(BigDecimal target) {
        BigDecimal current = cashInHand.lockForUpdate().getBalance();
        BigDecimal delta = target.subtract(current);
        if (delta.signum() != 0) {
            ledger.adjustCash(delta);
        }
    }

    private boolean recordsExist() {
        return bills.count() > 0 || vouchers.count() > 0 || supplierPayments.count() > 0;
    }

    private ShopProfile load() {
        return profiles.findById(ID).orElseThrow(
                () -> new NotFoundException("The shop has not been set up yet."));
    }
}