package com.vira;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.test.context.SpringBootTest;

import static org.junit.jupiter.api.Assertions.assertEquals;

/**
 * Boots the whole application against the configured database. This makes
 * CI exercise Flyway (migrate from empty) and spring.jpa.hibernate.ddl-auto=validate
 * on every push, which a build with zero tests never does.
 */
@SpringBootTest
class ViraApplicationTests {

    @Value("${server.address}")
    private String serverAddress;

    @Test
    void contextLoads() {
        // Passing means: the context started, Flyway applied the migrations
        // and Hibernate's schema validation accepted the result.
    }

    @Test
    void backendListensOnLoopbackOnly() {
        // SRS Revision 2 §2 / §24: no remote access to the API.
        assertEquals("127.0.0.1", serverAddress);
    }
}
