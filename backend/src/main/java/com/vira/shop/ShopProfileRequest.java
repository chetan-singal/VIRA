package com.vira.shop;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.time.LocalDate;

public record ShopProfileRequest(
        @NotBlank @Size(max = 150) String shopName,
        @Size(max = 255) String address,
        @Size(max = 20) String phone,
        @Size(max = 20) String alternatePhone,
        @Size(max = 150) String email,
        @Size(max = 100) String city,
        @Size(max = 100) String state,
        @Size(max = 10) String pinCode,
        @Size(max = 500) String notes,
        @Size(max = 20) String cashBillPrefix,
        @Size(max = 20) String partyBillPrefix,
        @Size(max = 20) String voucherPrefix,
        @Size(max = 20) String supplierPaymentPrefix,
        @NotNull @Min(1) Integer startingBillNumber,
        @NotNull BigDecimal openingCashInHand,
        @NotNull LocalDate openingCashInHandDate,
        @NotNull Boolean printShowShopName,
        @NotNull Boolean printShowAddress,
        @NotNull Boolean printShowPhone,
        @NotNull Boolean printShowLogo,
        @NotNull Boolean printShowThankyou,
        @NotNull Boolean printShowMrp,
        @Size(max = 1000) String printTermsConditions) {
}