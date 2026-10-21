package com.vira;

import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.HashMap;
import java.util.HashSet;
import java.util.Map;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

/**
 * Phase 1 "Done when", as an automated test.
 *
 * Wipes and re-migrates a SEPARATE scratch database (vira_test by default,
 * never the dev "vira" database), then checks the schema against SRS §22.
 * Override the target with DB_TEST_URL; credentials come from
 * DB_USERNAME / DB_PASSWORD, same as the application.
 */
class SchemaMigrationTest {

    private static final String URL = env("DB_TEST_URL",
            "jdbc:mysql://127.0.0.1:3306/vira_test?createDatabaseIfNotExist=true");
    private static final String USER = env("DB_USERNAME", "root");
    private static final String PASSWORD = env("DB_PASSWORD", "");

    private static final Set<String> EXPECTED_TABLES = Set.of(
            "part_category", "bike", "item", "item_bike",
            "party", "party_item_rate", "cash_item_rate",
            "supplier", "bill", "bill_item",
            "payment_voucher", "supplier_payment",
            "shop_profile", "cash_in_hand", "number_sequence", "app_setting");

    @BeforeAll
    static void migrateFromEmpty() {
        Flyway flyway = Flyway.configure()
                .dataSource(URL, USER, PASSWORD)
                .locations("classpath:db/migration")
                .cleanDisabled(false)
                .load();
        flyway.clean();
        flyway.migrate();
    }

    @Test
    void allSixteenTablesExist() throws SQLException {
        Set<String> actual = new HashSet<>();
        try (Connection c = connect();
             Statement s = c.createStatement();
             ResultSet rs = s.executeQuery(
                     "SELECT table_name FROM information_schema.tables "
                             + "WHERE table_schema = DATABASE() AND table_type = 'BASE TABLE' "
                             + "AND table_name <> 'flyway_schema_history'")) {
            while (rs.next()) {
                actual.add(rs.getString(1).toLowerCase());
            }
        }
        assertEquals(EXPECTED_TABLES, actual);
    }

    @Test
    void seedRowsExistAndShopProfileIsEmpty() throws SQLException {
        try (Connection c = connect()) {
            assertEquals(1, count(c, "cash_in_hand"));
            assertEquals(3, count(c, "number_sequence"));
            assertEquals(5, count(c, "app_setting"));
            assertEquals(0, count(c, "shop_profile"));

            assertEquals("0.00", scalar(c, "SELECT balance FROM cash_in_hand WHERE id = 1"));

            Set<String> sequences = new HashSet<>();
            try (Statement s = c.createStatement();
                 ResultSet rs = s.executeQuery("SELECT sequence_name, next_value FROM number_sequence")) {
                while (rs.next()) {
                    sequences.add(rs.getString(1));
                    assertEquals(1, rs.getInt(2));
                }
            }
            assertEquals(Set.of("BILL", "VOUCHER", "SUPPLIER_PAYMENT"), sequences);

            Set<String> settings = new HashSet<>();
            try (Statement s = c.createStatement();
                 ResultSet rs = s.executeQuery("SELECT setting_key FROM app_setting")) {
                while (rs.next()) {
                    settings.add(rs.getString(1));
                }
            }
            assertEquals(Set.of("default_bill_type", "default_focus_field",
                    "default_printer", "date_format", "theme"), settings);
        }
    }

    @Test
    void foreignKeysUseTheSpecifiedDeleteRules() throws SQLException {
        Map<String, String> expected = new HashMap<>();
        expected.put("item.part_category_id", "part_category:SET NULL");
        expected.put("item_bike.item_id", "item:CASCADE");
        expected.put("item_bike.bike_id", "bike:CASCADE");
        expected.put("party_item_rate.party_id", "party:CASCADE");
        expected.put("party_item_rate.item_id", "item:CASCADE");
        expected.put("cash_item_rate.item_id", "item:CASCADE");
        expected.put("bill.party_id", "party:SET NULL");
        expected.put("bill_item.bill_id", "bill:CASCADE");
        expected.put("bill_item.item_id", "item:SET NULL");
        expected.put("payment_voucher.party_id", "party:SET NULL");
        expected.put("supplier_payment.supplier_id", "supplier:SET NULL");

        Map<String, String> actual = new HashMap<>();
        try (Connection c = connect();
             Statement s = c.createStatement();
             ResultSet rs = s.executeQuery(
                     "SELECT k.table_name, k.column_name, k.referenced_table_name, r.delete_rule "
                             + "FROM information_schema.key_column_usage k "
                             + "JOIN information_schema.referential_constraints r "
                             + "  ON r.constraint_schema = k.constraint_schema "
                             + " AND r.constraint_name = k.constraint_name "
                             + " AND r.table_name = k.table_name "
                             + "WHERE k.table_schema = DATABASE() "
                             + "AND k.referenced_table_name IS NOT NULL")) {
            while (rs.next()) {
                actual.put(rs.getString(1).toLowerCase() + "." + rs.getString(2).toLowerCase(),
                        rs.getString(3).toLowerCase() + ":" + rs.getString(4));
            }
        }
        assertEquals(expected, actual);
    }

    @Test
    void quantityMustBeAtLeastOne() throws SQLException {
        try (Connection c = connect()) {
            c.setAutoCommit(false);
            try {
                long billId = insertCashBill(c, "T-QTY-1");
                insertBillItem(c, billId, 1, 1);                       // valid: must succeed
                assertThrows(SQLException.class,
                        () -> insertBillItem(c, billId, 0, 2));        // qty 0: CHECK must reject
            } finally {
                c.rollback();
            }
        }
    }

    @Test
    void rateOverridesNeedExactlyOneValue() throws SQLException {
        try (Connection c = connect()) {
            c.setAutoCommit(false);
            try {
                long itemId;
                try (PreparedStatement ps = c.prepareStatement(
                        "INSERT INTO item (name, unit, item_type, default_net_rate) "
                                + "VALUES ('Test item', 'Pcs', 'NET_RATE', 100.00)",
                        Statement.RETURN_GENERATED_KEYS)) {
                    ps.executeUpdate();
                    try (ResultSet keys = ps.getGeneratedKeys()) {
                        keys.next();
                        itemId = keys.getLong(1);
                    }
                }
                assertThrows(SQLException.class, () -> insertCashRate(c, itemId, null, null));
                assertThrows(SQLException.class, () -> insertCashRate(c, itemId, "10.00", "90.00"));
                insertCashRate(c, itemId, null, "90.00");              // exactly one: succeeds
            } finally {
                c.rollback();
            }
        }
    }

    @Test
    void singleRowTablesRejectAnyIdOtherThanOne() throws SQLException {
        try (Connection c = connect()) {
            assertThrows(SQLException.class, () -> {
                try (Statement s = c.createStatement()) {
                    s.executeUpdate("INSERT INTO cash_in_hand (id, balance) VALUES (2, 0)");
                }
            });
            assertThrows(SQLException.class, () -> {
                try (Statement s = c.createStatement()) {
                    s.executeUpdate("INSERT INTO shop_profile (id, shop_name) VALUES (2, 'X')");
                }
            });
        }
    }

    // ------------------------------------------------------------------
    // helpers
    // ------------------------------------------------------------------

    private static long insertCashBill(Connection c, String billNo) throws SQLException {
        try (PreparedStatement ps = c.prepareStatement(
                "INSERT INTO bill (bill_no, bill_type, bill_date, net_amount, grand_total) "
                        + "VALUES (?, 'CASH', CURDATE(), 100.00, 100.00)",
                Statement.RETURN_GENERATED_KEYS)) {
            ps.setString(1, billNo);
            ps.executeUpdate();
            try (ResultSet keys = ps.getGeneratedKeys()) {
                keys.next();
                return keys.getLong(1);
            }
        }
    }

    private static void insertBillItem(Connection c, long billId, int qty, int lineNo) throws SQLException {
        try (PreparedStatement ps = c.prepareStatement(
                "INSERT INTO bill_item (bill_id, item_name_snapshot, item_type_snapshot, "
                        + "unit_snapshot, rate_snapshot, qty, amount, line_no) "
                        + "VALUES (?, 'Test item', 'NET_RATE', 'Pcs', 100.00, ?, 100.00, ?)")) {
            ps.setLong(1, billId);
            ps.setInt(2, qty);
            ps.setInt(3, lineNo);
            ps.executeUpdate();
        }
    }

    private static void insertCashRate(Connection c, long itemId, String discount, String netRate)
            throws SQLException {
        try (PreparedStatement ps = c.prepareStatement(
                "INSERT INTO cash_item_rate (item_id, discount_percent, net_rate) VALUES (?, ?, ?)")) {
            ps.setLong(1, itemId);
            ps.setString(2, discount);
            ps.setString(3, netRate);
            ps.executeUpdate();
        }
    }

    private static long count(Connection c, String table) throws SQLException {
        try (Statement s = c.createStatement();
             ResultSet rs = s.executeQuery("SELECT COUNT(*) FROM " + table)) {
            rs.next();
            return rs.getLong(1);
        }
    }

    private static String scalar(Connection c, String sql) throws SQLException {
        try (Statement s = c.createStatement(); ResultSet rs = s.executeQuery(sql)) {
            rs.next();
            return rs.getString(1);
        }
    }

    private static Connection connect() throws SQLException {
        return DriverManager.getConnection(URL, USER, PASSWORD);
    }

    private static String env(String name, String fallback) {
        String value = System.getenv(name);
        return value != null ? value : fallback;
    }
}