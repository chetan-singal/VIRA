package com.vira.bill;

import com.vira.item.ItemType;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

import java.math.BigDecimal;

@Entity
@Table(name = "bill_item")
public class BillItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "bill_id", nullable = false)
    private Bill bill;

    @Column(name = "item_id")
    private Long itemId;

    @Column(name = "item_name_snapshot", nullable = false, length = 150)
    private String itemNameSnapshot;

    @Enumerated(EnumType.STRING)
    @Column(name = "item_type_snapshot", nullable = false)
    private ItemType itemTypeSnapshot;

    @Column(name = "unit_snapshot", nullable = false, length = 30)
    private String unitSnapshot;

    @Column(name = "mrp_snapshot")
    private BigDecimal mrpSnapshot;

    @Column(name = "discount_percent_snapshot")
    private BigDecimal discountPercentSnapshot;

    @Column(name = "rate_snapshot", nullable = false)
    private BigDecimal rateSnapshot;

    @Column(name = "qty", nullable = false)
    private Integer qty;

    @Column(name = "amount", nullable = false)
    private BigDecimal amount;

    @Column(name = "line_no", nullable = false)
    private Integer lineNo;

    protected BillItem() {}

    public Long getId() { return id; }

    public Bill getBill() { return bill; }
    public void setBill(Bill bill) { this.bill = bill; }

    public Long getItemId() { return itemId; }
    public void setItemId(Long itemId) { this.itemId = itemId; }

    public String getItemNameSnapshot() { return itemNameSnapshot; }
    public void setItemNameSnapshot(String itemNameSnapshot) { this.itemNameSnapshot = itemNameSnapshot; }

    public ItemType getItemTypeSnapshot() { return itemTypeSnapshot; }
    public void setItemTypeSnapshot(ItemType itemTypeSnapshot) { this.itemTypeSnapshot = itemTypeSnapshot; }

    public String getUnitSnapshot() { return unitSnapshot; }
    public void setUnitSnapshot(String unitSnapshot) { this.unitSnapshot = unitSnapshot; }

    public BigDecimal getMrpSnapshot() { return mrpSnapshot; }
    public void setMrpSnapshot(BigDecimal mrpSnapshot) { this.mrpSnapshot = mrpSnapshot; }

    public BigDecimal getDiscountPercentSnapshot() { return discountPercentSnapshot; }
    public void setDiscountPercentSnapshot(BigDecimal discountPercentSnapshot) { this.discountPercentSnapshot = discountPercentSnapshot; }

    public BigDecimal getRateSnapshot() { return rateSnapshot; }
    public void setRateSnapshot(BigDecimal rateSnapshot) { this.rateSnapshot = rateSnapshot; }

    public Integer getQty() { return qty; }
    public void setQty(Integer qty) { this.qty = qty; }

    public BigDecimal getAmount() { return amount; }
    public void setAmount(BigDecimal amount) { this.amount = amount; }

    public Integer getLineNo() { return lineNo; }
    public void setLineNo(Integer lineNo) { this.lineNo = lineNo; }
}