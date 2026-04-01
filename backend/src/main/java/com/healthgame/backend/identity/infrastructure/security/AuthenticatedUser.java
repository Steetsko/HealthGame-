package com.healthgame.backend.identity.infrastructure.security;

import java.util.Collection;
import java.util.List;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;

public record AuthenticatedUser(
        Long userId,
        String email,
        Collection<? extends GrantedAuthority> authorities
) {

    public static AuthenticatedUser user(Long userId, String email) {
        return new AuthenticatedUser(userId, email, List.of(new SimpleGrantedAuthority("ROLE_USER")));
    }
}