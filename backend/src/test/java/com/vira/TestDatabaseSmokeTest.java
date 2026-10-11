package com.vira;

import com.vira.support.TestData;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@ActiveProfiles("test")
@Transactional
class TestDatabaseSmokeTest {

    @Autowired
    private JdbcTemplate jdbc;

    @Test
    void schema_is_reachable_and_party_helper_works() {
        Long partyId = TestData.insertParty(jdbc, "Smoke Test Party");
        assertThat(partyId).isNotNull();

        Integer itemCount = jdbc.queryForObject("select count(*) from item", Integer.class);
        assertThat(itemCount).isZero();
    }
}