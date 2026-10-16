package com.vira.support;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;

import java.math.BigDecimal;
import java.sql.Statement;

public final class TestData {
    private TestData() {}

    public static Long insertParty(JdbcTemplate jdbc, String name) {
        KeyHolder keys = new GeneratedKeyHolder();
        jdbc.update(con -> {
            var ps = con.prepareStatement("insert into party (name) values (?)", Statement.RETURN_GENERATED_KEYS);
            ps.setString(1, name);
            return ps;
        }, keys);
        return keys.getKey().longValue();
    }

    public static Long insertCashBill(JdbcTemplate jdbc, String billNo) {
        KeyHolder keys = new GeneratedKeyHolder();
        jdbc.update(con -> {
            var ps = con.prepareStatement(
                    "insert into bill (bill_no, bill_type, bill_date, net_amount, grand_total) " +
                            "values (?, 'CASH', CURDATE(), 900.00, 900.00)",
                    Statement.RETURN_GENERATED_KEYS);
            ps.setString(1, billNo);
            return ps;
        }, keys);
        return keys.getKey().longValue();
    }

    public static void insertBillLine(JdbcTemplate jdbc, Long billId, Long itemId, String itemName,
                                       String unit, String mrp, String discountPercent, String rate,
                                       int qty, int lineNo) {
        BigDecimal amount = new BigDecimal(rate).multiply(BigDecimal.valueOf(qty));
        jdbc.update(
                "insert into bill_item (bill_id, item_id, item_name_snapshot, item_type_snapshot, " +
                        "unit_snapshot, mrp_snapshot, discount_percent_snapshot, rate_snapshot, qty, amount, line_no) " +
                        "values (?, ?, ?, 'MRP', ?, ?, ?, ?, ?, ?, ?)",
                billId, itemId, itemName, unit, new BigDecimal(mrp), new BigDecimal(discountPercent),
                new BigDecimal(rate), qty, amount, lineNo);
    }
}