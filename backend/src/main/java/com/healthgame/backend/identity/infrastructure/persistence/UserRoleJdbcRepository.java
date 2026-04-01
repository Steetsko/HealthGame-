package com.healthgame.backend.identity.infrastructure.persistence;

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
}