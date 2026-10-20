package com.vira.supplier;
import java.time.LocalDateTime;
import com.vira.common.BusinessRuleException;
import com.vira.common.NotFoundException;
import com.vira.common.PageResponse;

import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class SupplierService {

    private final SupplierRepository suppliers;

    public SupplierService(SupplierRepository suppliers) {
        this.suppliers = suppliers;
    }

    @Transactional
    public SupplierResponse create(SupplierRequest r) {
        Supplier supplier = new Supplier();
        supplier.setName(r.name().trim());
        supplier.setPhone(r.phone());
        supplier.setCity(r.city());
        return toResponse(suppliers.save(supplier));
    }

    @Transactional(readOnly = true)
    public PageResponse<SupplierResponse> list(String q, Pageable pageable) {
        Specification<Supplier> spec = Specification.allOf(
                SupplierSpecifications.notDeleted(), SupplierSpecifications.nameContains(q));
        return PageResponse.of(suppliers.findAll(spec, pageable).map(this::toResponse));
    }

    @Transactional(readOnly = true)
    public SupplierResponse get(Long id) {
        return toResponse(find(id));
    }
    @Transactional(readOnly = true)
    public Supplier loadActive(Long id) {
        Supplier supplier = find(id);
        if (supplier.isDeleted()) {
            throw new BusinessRuleException("SUPPLIER_INACTIVE", "This supplier is deleted and cannot be paid.");
        }
        return supplier;
    }

    Supplier find(Long id) {
        return suppliers.findById(id).orElseThrow(() -> new NotFoundException("Supplier " + id + " not found"));
    }

    private SupplierResponse toResponse(Supplier s) {
        return new SupplierResponse(s.getId(), s.getName(), s.getPhone(), s.getCity());
    }
    @Transactional
    public void delete(Long id) {
        Supplier supplier = find(id);
        if (supplier.isDeleted()) {
            throw new BusinessRuleException("SUPPLIER_ALREADY_DELETED", "This supplier is already deleted.");
        }
        supplier.setDeleted(true);
        supplier.setDeletedAt(LocalDateTime.now());
    }

    @Transactional
    public void restore(Long id) {
        Supplier supplier = find(id);
        if (!supplier.isDeleted()) {
            throw new BusinessRuleException("SUPPLIER_NOT_DELETED", "This supplier is not deleted.");
        }
        supplier.setDeleted(false);
        supplier.setDeletedAt(null);
    }

    @Transactional(readOnly = true)
    public Supplier loadAny(Long id) {
        return find(id);
    }
}