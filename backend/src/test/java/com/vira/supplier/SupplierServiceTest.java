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
}