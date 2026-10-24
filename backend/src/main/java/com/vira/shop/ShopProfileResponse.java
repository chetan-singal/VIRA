package com.vira.shop;

import java.math.BigDecimal;
import java.time.LocalDate;

public record ShopProfileResponse(
        String shopName, String address, String phone, String alternatePhone, String email,
        String city, String state, String pinCode, String notes, boolean hasLogo,
        String cashBillPrefix, String partyBillPrefix, String voucherPrefix, String supplierPaymentPrefix,
        Integer startingBillNumber, BigDecimal openingCashInHand, LocalDate openingCashInHandDate,
        boolean printShowShopName, boolean printShowAddress, boolean printShowPhone,
        boolean printShowLogo, boolean printShowThankyou, boolean printShowMrp,
        String printTermsConditions, boolean setupValuesLocked) {

    static ShopProfileResponse from(ShopProfile p, boolean locked) {
        boolean hasLogo = p.getLogoPath() != null && !p.getLogoPath().isBlank();
        return new ShopProfileResponse(
                p.getShopName(), p.getAddress(), p.getPhone(), p.getAlternatePhone(), p.getEmail(),
                p.getCity(), p.getState(), p.getPinCode(), p.getNotes(), hasLogo,
                p.getCashBillPrefix(), p.getPartyBillPrefix(), p.getVoucherPrefix(),
                p.getSupplierPaymentPrefix(), p.getStartingBillNumber(), p.getOpeningCashInHand(),
                p.getOpeningCashInHandDate(), p.isPrintShowShopName(), p.isPrintShowAddress(),
                p.isPrintShowPhone(), p.isPrintShowLogo(), p.isPrintShowThankyou(), p.isPrintShowMrp(),
                p.getPrintTermsConditions(), locked);
    }
}