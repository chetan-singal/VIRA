package com.vira.ledger;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "number_sequence")
public class NumberSequence {

    @Id
    @Column(name = "sequence_name")
    private String sequenceName;

    @Column(name = "next_value", nullable = false)
    private Integer nextValue;

    protected NumberSequence() {}

    public String getSequenceName() { return sequenceName; }
    public Integer getNextValue() { return nextValue; }
    public void setNextValue(Integer nextValue) { this.nextValue = nextValue; }
}