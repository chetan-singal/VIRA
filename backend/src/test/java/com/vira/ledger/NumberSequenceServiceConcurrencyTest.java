package com.vira.ledger;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;

import java.util.List;
import java.util.Set;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.stream.Collectors;
import java.util.stream.IntStream;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@ActiveProfiles("test")
class NumberSequenceServiceConcurrencyTest {

    private static final int THREADS = 50;

    @Autowired
    private NumberSequenceService sequenceService;

    @Autowired
    private JdbcTemplate jdbc;

    @BeforeEach
    void resetVoucherSequence() {
        jdbc.update("update number_sequence set next_value = 1 where sequence_name = 'VOUCHER'");
    }

    @Test
    void fiftyConcurrentCallsReturnDistinctSequentialValues() throws Exception {
        ExecutorService pool = Executors.newFixedThreadPool(THREADS);
        CountDownLatch startGate = new CountDownLatch(1);
        CountDownLatch done = new CountDownLatch(THREADS);
        List<Integer> issued = new CopyOnWriteArrayList<>();

        for (int i = 0; i < THREADS; i++) {
            pool.submit(() -> {
                try {
                    startGate.await();
                    issued.add(sequenceService.nextValue(NumberSequenceService.VOUCHER));
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

        Set<Integer> expected = IntStream.rangeClosed(1, THREADS).boxed().collect(Collectors.toSet());
        assertThat(issued).hasSize(THREADS);
        assertThat(Set.copyOf(issued)).isEqualTo(expected);
    }
}