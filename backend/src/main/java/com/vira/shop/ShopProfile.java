package com.vira.shop;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.math.BigDecimal;
import java.time.LocalDate;

@Entity
@Table(name = "shop_profile")
public class ShopProfile {

    @Id
    private Long id; // always 1

    @Column(name = "shop_name", nullable = false, length = 150)
    private String shopName;

    @Column(name = "address", length = 255)
    private String address;

    @Column(name = "phone", length = 20)
    private String phone;

    @Column(name = "alternate_phone", length = 20)
    private String alternatePhone;

    @Column(name = "email", length = 150)
    private String email;

    @Column(name = "city", length = 100)
    private String city;

    @Column(name = "state", length = 100)
    private String state;

    @Column(name = "pin_code", length = 10)
    private String pinCode;

    @Column(name = "notes", length = 500)
    private String notes;

    @Column(name = "logo_path", length = 255)
    private String logoPath;

    @Column(name = "cash_bill_prefix", length = 20)
    private String cashBillPrefix;

    @Column(name = "party_bill_prefix", length = 20)
    private String partyBillPrefix;

    @Column(name = "voucher_prefix", length = 20)
    private String voucherPrefix;

    @Column(name = "supplier_payment_prefix", length = 20)
    private String supplierPaymentPrefix;

    @Column(name = "starting_bill_number")
    private Integer startingBillNumber;

    @Column(name = "print_show_shop_name", nullable = false)
    private boolean printShowShopName = true;

    @Column(name = "print_show_address", nullable = false)
    private boolean printShowAddress = true;

    @Column(name = "print_show_phone", nullable = false)
    private boolean printShowPhone = true;

    @Column(name = "print_show_logo", nullable = false)
    private boolean printShowLogo = true;

    @Column(name = "print_show_thankyou", nullable = false)
    private boolean printShowThankyou = true;

    @Column(name = "print_terms_conditions", length = 1000)
    private String printTermsConditions;

    @Column(name = "print_show_mrp", nullable = false)
    private boolean printShowMrp = true;

    @Column(name = "opening_cash_in_hand")
    private BigDecimal openingCashInHand;

    @Column(name = "opening_cash_in_hand_date")
    private LocalDate openingCashInHandDate;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getShopName() { return shopName; }
    public void setShopName(String shopName) { this.shopName = shopName; }

    public String getAddress() { return address; }
    public void setAddress(String address) { this.address = address; }

    public String getPhone() { return phone; }
    public void setPhone(String phone) { this.phone = phone; }

    public String getAlternatePhone() { return alternatePhone; }
    public void setAlternatePhone(String alternatePhone) { this.alternatePhone = alternatePhone; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getCity() { return city; }
    public void setCity(String city) { this.city = city; }

    public String getState() { return state; }
    public void setState(String state) { this.state = state; }

    public String getPinCode() { return pinCode; }
    public void setPinCode(String pinCode) { this.pinCode = pinCode; }

    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }

    public String getLogoPath() { return logoPath; }
    public void setLogoPath(String logoPath) { this.logoPath = logoPath; }

    public String getCashBillPrefix() { return cashBillPrefix; }
    public void setCashBillPrefix(String cashBillPrefix) { this.cashBillPrefix = cashBillPrefix; }

    public String getPartyBillPrefix() { return partyBillPrefix; }
    public void setPartyBillPrefix(String partyBillPrefix) { this.partyBillPrefix = partyBillPrefix; }

    public String getVoucherPrefix() { return voucherPrefix; }
    public void setVoucherPrefix(String voucherPrefix) { this.voucherPrefix = voucherPrefix; }

    public String getSupplierPaymentPrefix() { return supplierPaymentPrefix; }
    public void setSupplierPaymentPrefix(String supplierPaymentPrefix) { this.supplierPaymentPrefix = supplierPaymentPrefix; }

    public Integer getStartingBillNumber() { return startingBillNumber; }
    public void setStartingBillNumber(Integer startingBillNumber) { this.startingBillNumber = startingBillNumber; }

    public boolean isPrintShowShopName() { return printShowShopName; }
    public void setPrintShowShopName(boolean printShowShopName) { this.printShowShopName = printShowShopName; }

    public boolean isPrintShowAddress() { return printShowAddress; }
    public void setPrintShowAddress(boolean printShowAddress) { this.printShowAddress = printShowAddress; }

    public boolean isPrintShowPhone() { return printShowPhone; }
    public void setPrintShowPhone(boolean printShowPhone) { this.printShowPhone = printShowPhone; }

    public boolean isPrintShowLogo() { return printShowLogo; }
    public void setPrintShowLogo(boolean printShowLogo) { this.printShowLogo = printShowLogo; }

    public boolean isPrintShowThankyou() { return printShowThankyou; }
    public void setPrintShowThankyou(boolean printShowThankyou) { this.printShowThankyou = printShowThankyou; }

    public String getPrintTermsConditions() { return printTermsConditions; }
    public void setPrintTermsConditions(String printTermsConditions) { this.printTermsConditions = printTermsConditions; }

    public boolean isPrintShowMrp() { return printShowMrp; }
    public void setPrintShowMrp(boolean printShowMrp) { this.printShowMrp = printShowMrp; }

    public BigDecimal getOpeningCashInHand() { return openingCashInHand; }
    public void setOpeningCashInHand(BigDecimal openingCashInHand) { this.openingCashInHand = openingCashInHand; }

    public LocalDate getOpeningCashInHandDate() { return openingCashInHandDate; }
    public void setOpeningCashInHandDate(LocalDate openingCashInHandDate) { this.openingCashInHandDate = openingCashInHandDate; }
}