package com.vira.supplier;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.data.domain.PageRequest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@ActiveProfiles("test")
@Transactional
class SupplierServiceTest {

    @Autowired
    private SupplierService supplierService;

    @Autowired
    private SupplierRepository supplierRepository;
    @Test
    void createSavesAllFields() {
        SupplierResponse response = supplierService.create(
                new SupplierRequest("Bajaj Spares Depot", "9876543210", "Pune"));

        assertThat(response.name()).isEqualTo("Bajaj Spares Depot");
        assertThat(response.phone()).isEqualTo("9876543210");
        assertThat(response.city()).isEqualTo("Pune");
    }

    @Test
    void listSearchesByPartialCaseInsensitiveName() {
        supplierService.create(new SupplierRequest("Hero Spares Co", null, null));
        supplierService.create(new SupplierRequest("Unrelated Supplier", null, null));

        var page = supplierService.list("hero", PageRequest.of(0, 10));

        assertThat(page.content()).hasSize(1);
        assertThat(page.content().get(0).name()).isEqualTo("Hero Spares Co");
    }

    @Test
    void listFindsASupplierByCityAndByPhone() {
        supplierService.create(new SupplierRequest("City Search Supplier", "9822077889", "Kolhapur"));
        supplierService.create(new SupplierRequest("Other Search Supplier", "9000000002", "Nashik"));

        var byCity = supplierService.list("kolhap", PageRequest.of(0, 10));
        assertThat(byCity.content()).hasSize(1);
        assertThat(byCity.content().get(0).name()).isEqualTo("City Search Supplier");

        var byPhone = supplierService.list("822077", PageRequest.of(0, 10));
        assertThat(byPhone.content()).hasSize(1);
        assertThat(byPhone.content().get(0).name()).isEqualTo("City Search Supplier");
    }

    @Test
    void deleteWorksAtAnyBalanceAndRestoreClearsFlag() {
        SupplierResponse supplier = supplierService.create(new SupplierRequest("Delete Test Supplier", null, null));

        supplierService.delete(supplier.id());
        assertThat(supplierRepository.findById(supplier.id()).orElseThrow().isDeleted()).isTrue();

        supplierService.restore(supplier.id());
        assertThat(supplierRepository.findById(supplier.id()).orElseThrow().isDeleted()).isFalse();
}
}