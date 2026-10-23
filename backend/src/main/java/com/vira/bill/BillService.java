package com.vira.bill;

import com.vira.common.BusinessRuleException;
import com.vira.common.FieldValidationException;
import com.vira.common.Money;
import com.vira.common.NotFoundException;
import com.vira.common.RecordActions;
import com.vira.item.Item;
import com.vira.item.ItemRepository;
import com.vira.ledger.LedgerService;
import com.vira.ledger.NumberSequenceService;
import com.vira.party.Party;
import com.vira.party.PartyService;
import com.vira.pricing.LinePrice;
import com.vira.pricing.PricingCalculator;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Service
public class BillService {

    private final BillRepository bills;
    private final ItemRepository items;
    private final PartyService partyService;
    private final LedgerService ledger;
    private final NumberSequenceService numbers;

    public BillService(BillRepository bills, ItemRepository items, PartyService partyService,
                        LedgerService ledger, NumberSequenceService numbers) {
        this.bills = bills;
        this.items = items;
        this.partyService = partyService;
        this.ledger = ledger;
        this.numbers = numbers;
    }

    @Transactional(readOnly = true)
    public BillResponse get(Long id) {
        Bill bill = find(id);
        return toResponse(bill, partyDeleted(bill));
    }

    @Transactional
    public BillResponse create(BillRequest r) {
        if (r.billType() == BillType.PARTY && r.partyId() == null) {
            throw new FieldValidationException("partyId", "Required for a Party Bill");
        }
        Party party = r.billType() == BillType.PARTY ? partyService.loadActive(r.partyId()) : null;

        Bill bill = new Bill();
        bill.setBillType(r.billType());
        bill.setBillDate(r.billDate());
        bill.setPartyId(party == null ? null : party.getId());
        bill.setPartyNameSnapshot(party == null ? null : party.getName());

        BigDecimal netAmount = priceLines(bill, r.lines());

        BigDecimal roundOff = r.roundOff() != null ? Money.round(r.roundOff()) : nearestRupeeRoundOff(netAmount);
        BigDecimal grandTotal = Money.round(netAmount.add(roundOff));

        bill.setNetAmount(netAmount);
        bill.setRoundOff(roundOff);
        bill.setGrandTotal(grandTotal);

        bill.setBillNo(String.valueOf(numbers.nextValue(NumberSequenceService.BILL)));

        Bill saved = bills.save(bill);

        if (r.billType() == BillType.CASH) {
            ledger.adjustCash(grandTotal);
            saved.setPreviousBalance(null);
        } else {
            BigDecimal updated = ledger.adjustPartyBalance(party.getId(), grandTotal);
            saved.setPreviousBalance(updated.subtract(grandTotal));
        }

        return toResponse(saved, false);
    }

    private BigDecimal priceLines(Bill bill, List<BillLineRequest> lineRequests) {
        bill.getItems().clear(); // no-op on create (already empty); on edit, orphanRemoval drops the old lines
        BigDecimal netAmount = BigDecimal.ZERO;
        for (int i = 0; i < lineRequests.size(); i++) {
            BillLineRequest lineReq = lineRequests.get(i);
            final int lineIndex = i;

            Item item = items.findById(lineReq.itemId())
                    .orElseThrow(() -> new FieldValidationException(
                            "lines[" + lineIndex + "].itemId", "Item not found"));

            LinePrice price;
            try {
                price = PricingCalculator.priceLine(
                        item.getItemType(), lineReq.mrp(), lineReq.discountPercent(), lineReq.netRate());
            } catch (FieldValidationException e) {
                var first = e.getErrors().get(0);
                throw new FieldValidationException("lines[" + lineIndex + "]." + first.field(), first.message());
            }
            BigDecimal amount = Money.round(price.rate().multiply(BigDecimal.valueOf(lineReq.qty())));

            BillItem line = new BillItem();
            line.setItemId(item.getId());
            line.setItemNameSnapshot(item.getName());
            line.setItemTypeSnapshot(item.getItemType());
            line.setUnitSnapshot(item.getUnit());
            line.setMrpSnapshot(price.mrp());
            line.setDiscountPercentSnapshot(price.discountPercent());
            line.setRateSnapshot(price.rate());
            line.setQty(lineReq.qty());
            line.setAmount(amount);
            line.setLineNo(i + 1);
            bill.addItem(line);

            netAmount = netAmount.add(amount);
        }
        return Money.round(netAmount);
    }

    @Transactional
    public BillResponse edit(Long id, BillRequest r) {
        Bill bill = find(id);
        if (bill.isDeleted()) {
            throw new BusinessRuleException("BILL_DELETED", "This bill is deleted. Restore it first.");
        }
        if (bill.getBillType() == BillType.PARTY) {
            partyService.loadActive(bill.getPartyId());
        }
        if (r.billType() == BillType.PARTY && r.partyId() == null) {
            throw new FieldValidationException("partyId", "Required for a Party Bill");
        }

        BigDecimal oldGrandTotal = bill.getGrandTotal();
        if (bill.getBillType() == BillType.CASH) {
            ledger.adjustCash(oldGrandTotal.negate());
        } else {
            ledger.adjustPartyBalance(bill.getPartyId(), oldGrandTotal.negate());
        }

        Party newParty = r.billType() == BillType.PARTY ? partyService.loadActive(r.partyId()) : null;
        bill.setBillType(r.billType());
        bill.setBillDate(r.billDate());
        bill.setPartyId(newParty == null ? null : newParty.getId());
        bill.setPartyNameSnapshot(newParty == null ? null : newParty.getName());

        BigDecimal netAmount = priceLines(bill, r.lines());
        BigDecimal roundOff = r.roundOff() != null ? Money.round(r.roundOff()) : nearestRupeeRoundOff(netAmount);
        BigDecimal grandTotal = Money.round(netAmount.add(roundOff));

        bill.setNetAmount(netAmount);
        bill.setRoundOff(roundOff);
        bill.setGrandTotal(grandTotal);
        bill.setEdited(true);
        bill.setLastEditedAt(LocalDateTime.now());

        Bill saved = bills.save(bill);

        if (r.billType() == BillType.CASH) {
            ledger.adjustCash(grandTotal);
            saved.setPreviousBalance(null);
        } else {
            BigDecimal updated = ledger.adjustPartyBalance(newParty.getId(), grandTotal);
            saved.setPreviousBalance(updated.subtract(grandTotal));
        }

        return toResponse(saved, false);
    }

    @Transactional
    public void delete(Long id) {
        Bill bill = find(id);
        if (bill.isDeleted()) {
            throw new BusinessRuleException("BILL_ALREADY_DELETED", "This bill is already deleted.");
        }
        if (bill.getBillType() == BillType.PARTY) {
            partyService.loadActive(bill.getPartyId());
        }
        if (bill.getBillType() == BillType.CASH) {
            ledger.adjustCash(bill.getGrandTotal().negate());
        } else {
            ledger.adjustPartyBalance(bill.getPartyId(), bill.getGrandTotal().negate());
        }
        bill.setDeleted(true);
        bill.setDeletedAt(LocalDateTime.now());
    }

    @Transactional
    public BillResponse restore(Long id) {
        Bill bill = find(id);
        if (!bill.isDeleted()) {
            throw new BusinessRuleException("BILL_NOT_DELETED", "This bill is not deleted.");
        }
        if (bill.getBillType() == BillType.PARTY && partyService.loadAny(bill.getPartyId()).isDeleted()) {
            throw new BusinessRuleException("RESTORE_BLOCKED_PARTY_DELETED",
                    "This bill's party is deleted. Restore the party first.");
        }

        BigDecimal grandTotal = bill.getGrandTotal();
        if (bill.getBillType() == BillType.CASH) {
            ledger.adjustCash(grandTotal);
        } else {
            BigDecimal updated = ledger.adjustPartyBalance(bill.getPartyId(), grandTotal);
            bill.setPreviousBalance(updated.subtract(grandTotal));
        }
        bill.setDeleted(false);
        bill.setDeletedAt(null);
        return toResponse(bill, false);
    }

    Bill find(Long id) {
        return bills.findById(id).orElseThrow(() -> new NotFoundException("Bill " + id + " not found"));
    }

    private boolean partyDeleted(Bill b) {
        return b.getBillType() == BillType.PARTY && b.getPartyId() != null
                && partyService.loadAny(b.getPartyId()).isDeleted();
    }

    private BigDecimal nearestRupeeRoundOff(BigDecimal netAmount) {
        BigDecimal nearestWhole = netAmount.setScale(0, Money.ROUNDING);
        return nearestWhole.subtract(netAmount).setScale(Money.SCALE, Money.ROUNDING);
    }

    private BillResponse toResponse(Bill b, boolean partyDeleted) {
        List<BillLineResponse> lines = b.getItems().stream()
                .map(i -> new BillLineResponse(i.getItemId(), i.getItemNameSnapshot(), i.getUnitSnapshot(),
                        i.getItemTypeSnapshot(), i.getMrpSnapshot(), i.getDiscountPercentSnapshot(),
                        i.getRateSnapshot(), i.getQty(), i.getAmount(), i.getLineNo()))
                .toList();
        BigDecimal previous = b.getPreviousBalance();
        BigDecimal totalDue = previous == null ? null : Money.round(previous.add(b.getGrandTotal()));
        return new BillResponse(b.getId(), b.getBillNo(), b.getBillType(), b.getPartyId(),
                b.getPartyNameSnapshot(), b.getBillDate(), lines,
                b.getNetAmount(), b.getRoundOff(), b.getGrandTotal(), previous, totalDue,
                b.isEdited(), b.getLastEditedAt(), b.isDeleted(), b.getDeletedAt(),
                RecordActions.of(b.isDeleted(), partyDeleted, "party"));
    }
}