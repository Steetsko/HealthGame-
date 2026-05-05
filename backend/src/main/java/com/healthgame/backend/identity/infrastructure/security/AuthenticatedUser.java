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

    public static AuthenticatedUser user(Long userId, String email, List<String> roleCodes) {
        List<SimpleGrantedAuthority> mappedAuthorities = roleCodes == null || roleCodes.isEmpty()
                ? List.of(new SimpleGrantedAuthority("ROLE_USER"))
                : roleCodes.stream().map(SimpleGrantedAuthority::new).toList();
        return new AuthenticatedUser(userId, email, mappedAuthorities);
    }

    public boolean isAdmin() {
        return authorities.stream().anyMatch(authority -> "ROLE_ADMIN".equals(authority.getAuthority()));
    }
}