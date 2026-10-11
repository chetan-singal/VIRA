package com.vira.pricing;

import jakarta.persistence.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "cash_item_rate")
public class CashItemRate {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "item_id", nullable = false)
    private Long itemId;

    @Column(name = "discount_percent")
    private BigDecimal discountPercent;

    @Column(name = "net_rate")
    private BigDecimal netRate;

    @Column(name = "updated_at", insertable = false, updatable = false)
    private LocalDateTime updatedAt;

    protected CashItemRate() {}
    public CashItemRate(Long itemId) { this.itemId = itemId; }

    public Long getId() { return id; }
    public Long getItemId() { return itemId; }
    public BigDecimal getDiscountPercent() { return discountPercent; }
    public void setDiscountPercent(BigDecimal discountPercent) {
        this.discountPercent = discountPercent;
        this.netRate = null;
    }
    public BigDecimal getNetRate() { return netRate; }
    public void setNetRate(BigDecimal netRate) {
        this.netRate = netRate;
        this.discountPercent = null;
    }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
}