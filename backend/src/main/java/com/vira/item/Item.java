package com.vira.item;

import com.vira.pricing.ItemType;
import jakarta.persistence.*;

import java.math.BigDecimal;
import java.util.HashSet;
import java.util.Set;

@Entity
@Table(name = "item")
public class Item {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "name", nullable = false, length = 150)
    private String name;

    @Column(name = "unit", nullable = false, length = 30)
    private String unit;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "part_category_id")
    private PartCategory partCategory;

    @Enumerated(EnumType.STRING)
    @Column(name = "item_type", nullable = false)
    private ItemType itemType;

    @Column(name = "mrp")
    private BigDecimal mrp;

    @Column(name = "default_discount_percent")
    private BigDecimal defaultDiscountPercent;

    @Column(name = "default_net_rate")
    private BigDecimal defaultNetRate;

    @ManyToMany
    @JoinTable(name = "item_bike",
            joinColumns = @JoinColumn(name = "item_id"),
            inverseJoinColumns = @JoinColumn(name = "bike_id"))
    private Set<Bike> bikes = new HashSet<>();

    protected Item() {}

    public Long getId() { return id; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getUnit() { return unit; }
    public void setUnit(String unit) { this.unit = unit; }
    public PartCategory getPartCategory() { return partCategory; }
    public void setPartCategory(PartCategory partCategory) { this.partCategory = partCategory; }
    public ItemType getItemType() { return itemType; }
    public void setItemType(ItemType itemType) { this.itemType = itemType; }
    public BigDecimal getMrp() { return mrp; }
    public void setMrp(BigDecimal mrp) { this.mrp = mrp; }
    public BigDecimal getDefaultDiscountPercent() { return defaultDiscountPercent; }
    public void setDefaultDiscountPercent(BigDecimal v) { this.defaultDiscountPercent = v; }
    public BigDecimal getDefaultNetRate() { return defaultNetRate; }
    public void setDefaultNetRate(BigDecimal defaultNetRate) { this.defaultNetRate = defaultNetRate; }
    public Set<Bike> getBikes() { return bikes; }
}