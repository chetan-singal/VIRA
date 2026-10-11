package com.vira.support;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;

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
}