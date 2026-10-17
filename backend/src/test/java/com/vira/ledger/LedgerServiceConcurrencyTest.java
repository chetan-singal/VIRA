package com.vira.ledger;

import com.vira.support.TestData;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;

import java.math.BigDecimal;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@ActiveProfiles("test")
class LedgerServiceConcurrencyTest {

    private static final int THREADS = 50;

    @Autowired
    private LedgerService ledger;

    @Autowired
    private JdbcTemplate jdbc;

    @BeforeEach
    void resetCashBalance() {
        jdbc.update("update cash_in_hand set balance = 0 where id = 1");
    }

    @Test
    void fiftyConcurrentCashAdjustmentsLoseNoUpdates() throws Exception {
        runConcurrently(() -> ledger.adjustCash(BigDecimal.ONE));

        BigDecimal balance = jdbc.queryForObject(
                "select balance from cash_in_hand where id = 1", BigDecimal.class);
        assertThat(balance).isEqualByComparingTo("50.00");
    }

    @Test
    void fiftyConcurrentPartyAdjustmentsLoseNoUpdates() throws Exception {
        Long partyId = TestData.insertParty(jdbc, "Concurrency Party");

        runConcurrently(() -> ledger.adjustPartyBalance(partyId, BigDecimal.ONE));

        BigDecimal balance = jdbc.queryForObject(
                "select current_balance from party where id = ?", BigDecimal.class, partyId);
        assertThat(balance).isEqualByComparingTo("50.00");
    }

    @Test
    void mixedConcurrentCashAndPartyAdjustmentsDoNotDeadlock() throws Exception {
        Long partyId = TestData.insertParty(jdbc, "Mixed Concurrency Party");

        ExecutorService pool = Executors.newFixedThreadPool(THREADS);
        CountDownLatch startGate = new CountDownLatch(1);
        CountDownLatch done = new CountDownLatch(THREADS);

        for (int i = 0; i < THREADS; i++) {
            boolean cash = i % 2 == 0;
            pool.submit(() -> {
                try {
                    startGate.await();
                    if (cash) {
                        ledger.adjustCash(BigDecimal.ONE);
                    } else {
                        ledger.adjustPartyBalance(partyId, BigDecimal.ONE);
                    }
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                } finally {
                    done.countDown();
                }
            });
        }
        startGate.countDown();
        boolean finished = done.await(30, TimeUnit.SECONDS);
        pool.shutdown();

        assertThat(finished).isTrue();
    }

    private void runConcurrently(Runnable action) throws InterruptedException {
        ExecutorService pool = Executors.newFixedThreadPool(THREADS);
        CountDownLatch startGate = new CountDownLatch(1);
        CountDownLatch done = new CountDownLatch(THREADS);

        for (int i = 0; i < THREADS; i++) {
            pool.submit(() -> {
                try {
                    startGate.await();
                    action.run();
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                } finally {
                    done.countDown();
                }
            });
        }
        startGate.countDown();
        done.await(30, TimeUnit.SECONDS);
        pool.shutdown();
    }
}