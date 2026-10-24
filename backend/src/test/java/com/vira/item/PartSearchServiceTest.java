package com.vira.item;

import com.vira.common.PageResponse;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.data.domain.PageRequest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@ActiveProfiles("test")
@Transactional
class PartSearchServiceTest {

    @Autowired private ItemService itemService;
    @Autowired private PartCategoryRepository categories;
    @Autowired private BikeRepository bikes;

    private ItemRequest item(String name, Long categoryId, Set<Long> bikeIds) {
        return new ItemRequest(name, "Pcs", categoryId, bikeIds, ItemType.MRP,
                new BigDecimal("500.00"), new BigDecimal("10.00"), null);
    }

    @Test
    void filtersByCategoryAndCompatibleBike() {
        Long brakes = categories.save(new PartCategory("Search Brakes")).getId();
        Long splendor = bikes.save(new Bike("Search Splendor")).getId();
        Long pulsar = bikes.save(new Bike("Search Pulsar")).getId();
        itemService.create(item("Search Pad", brakes, Set.of(splendor)));
        itemService.create(item("Search Disc", brakes, Set.of(pulsar)));

        PageResponse<ItemResponse> result =
                itemService.search(null, brakes, splendor, PageRequest.of(0, 10));

        assertThat(result.content()).extracting(ItemResponse::name).containsExactly("Search Pad");
        assertThat(result.content().get(0).bikes()).extracting(IdName::name).containsExactly("Search Splendor");
        assertThat(result.content().get(0).defaultRate()).isEqualByComparingTo("450.00");
    }
}