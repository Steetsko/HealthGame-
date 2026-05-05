package com.healthgame.backend.identity.infrastructure.persistence;

import java.util.List;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class UserRoleJdbcRepository {

    private final JdbcTemplate jdbcTemplate;

    public UserRoleJdbcRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public void assignDefaultUserRole(Long userId) {
        jdbcTemplate.update(
                """
                insert into user_roles (user_id, role_id)
                select ?, r.id
                from roles r
                where r.code = 'ROLE_USER'
                on conflict do nothing
                """,
                userId
        );
    }

    public List<String> findRoleCodesByUserId(Long userId) {
        return jdbcTemplate.query(
                """
                select r.code
                from user_roles ur
                join roles r on r.id = ur.role_id
                where ur.user_id = ?
                order by r.code
                """,
                (rs, rowNum) -> rs.getString("code"),
                userId
        );
    }

    public void assignAdminRole(Long userId) {
        jdbcTemplate.update(
                """
                insert into user_roles (user_id, role_id)
                select ?, r.id
                from roles r
                where r.code = 'ROLE_ADMIN'
                on conflict do nothing
                """,
                userId
        );
    }
}