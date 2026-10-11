package com.vira.item;

import com.vira.common.FieldValidationException;
import com.vira.common.NotFoundException;
import com.vira.pricing.ItemType;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.data.domain.PageRequest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@SpringBootTest
@ActiveProfiles("test")
@Transactional
class ItemServiceTest {

    @Autowired private ItemService itemService;
    @Autowired private PartCategoryRepository categories;
    @Autowired private BikeRepository bikes;

    private static BigDecimal bd(String s) { return new BigDecimal(s); }

    private ItemRequest mrpRequest(String name, Long categoryId, Set<Long> bikeIds) {
        return new ItemRequest(name, "Pcs", categoryId, bikeIds,
                ItemType.MRP, bd("500.00"), bd("10.00"), null);
    }

    private ItemRequest netRateRequest(String name) {
        return new ItemRequest(name, "Box", null, null,
                ItemType.NET_RATE, null, null, bd("650.00"));
    }

    @Test
    void create_and_view_mrp_item() {
        ItemResponse created = itemService.create(mrpRequest("Brake Pad", null, null));

        assertThat(created.id()).isNotNull();
        assertThat(created.mrp()).isEqualByComparingTo("500.00");
        assertThat(created.defaultDiscountPercent()).isEqualByComparingTo("10.00");
        assertThat(created.defaultRate()).isEqualByComparingTo("450.00");
        assertThat(created.defaultNetRate()).isNull();

        ItemResponse fetched = itemService.get(created.id());
        assertThat(fetched.typeLocked()).isFalse();
    }

    @Test
    void create_and_view_net_rate_item() {
        ItemResponse created = itemService.create(netRateRequest("Chain Lube"));

        assertThat(created.mrp()).isNull();
        assertThat(created.defaultDiscountPercent()).isNull();
        assertThat(created.defaultRate()).isEqualByComparingTo("650.00");
    }

    @Test
    void mrp_item_missing_mrp_is_rejected() {
        ItemRequest bad = new ItemRequest("Bad Item", "Pcs", null, null,
                ItemType.MRP, null, bd("10.00"), null);

        assertThatThrownBy(() -> itemService.create(bad))
                .isInstanceOf(FieldValidationException.class);
    }

    @Test
    void net_rate_item_with_discount_is_rejected() {
        ItemRequest bad = new ItemRequest("Bad Item", "Pcs", null, null,
                ItemType.NET_RATE, null, bd("10.00"), bd("650.00"));

        assertThatThrownBy(() -> itemService.create(bad))
                .isInstanceOf(FieldValidationException.class);
    }

    @Test
    void category_and_bikes_are_linked_correctly() {
        Long categoryId = categories.save(new PartCategory("Brakes")).getId();
        Long bikeId = bikes.save(new Bike("Splendor")).getId();

        ItemResponse created = itemService.create(mrpRequest("Brake Pad", categoryId, Set.of(bikeId)));

        assertThat(created.partCategory().id()).isEqualTo(categoryId);
        assertThat(created.bikes()).hasSize(1);
        assertThat(created.bikes().get(0).id()).isEqualTo(bikeId);
    }

    @Test
    void search_filter_and_paging() {
        itemService.create(mrpRequest("Brake Pad", null, null));
        itemService.create(mrpRequest("Brake Cable", null, null));
        itemService.create(netRateRequest("Chain Lube"));

        var byName = itemService.list("brake", null, null, PageRequest.of(0, 20));
        assertThat(byName.totalElements()).isEqualTo(2);

        var byType = itemService.list(null, ItemType.NET_RATE, null, PageRequest.of(0, 20));
        assertThat(byType.totalElements()).isEqualTo(1);

        var firstPage = itemService.list(null, null, null, PageRequest.of(0, 2));
        assertThat(firstPage.content()).hasSize(2);
        assertThat(firstPage.totalElements()).isEqualTo(3);
    }

    @Test
    void edit_updates_fields() {
        ItemResponse created = itemService.create(mrpRequest("Brake Pad", null, null));

        ItemRequest edit = new ItemRequest("Brake Pad (Front)", "Box", null, null,
                ItemType.MRP, bd("600.00"), bd("5.00"), null);
        ItemResponse updated = itemService.update(created.id(), edit);

        assertThat(updated.name()).isEqualTo("Brake Pad (Front)");
        assertThat(updated.unit()).isEqualTo("Box");
        assertThat(updated.defaultRate()).isEqualByComparingTo("570.00");
    }

    @Test
    void permanent_delete_then_get_returns_404() {
        ItemResponse created = itemService.create(mrpRequest("Brake Pad", null, null));

        itemService.delete(created.id());

        assertThatThrownBy(() -> itemService.get(created.id()))
                .isInstanceOf(NotFoundException.class);
    }
}