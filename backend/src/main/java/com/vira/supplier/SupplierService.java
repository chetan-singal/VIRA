package com.vira.supplier;

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

    Supplier find(Long id) {
        return suppliers.findById(id).orElseThrow(() -> new NotFoundException("Supplier " + id + " not found"));
    }

    private SupplierResponse toResponse(Supplier s) {
        return new SupplierResponse(s.getId(), s.getName(), s.getPhone(), s.getCity());
    }
}