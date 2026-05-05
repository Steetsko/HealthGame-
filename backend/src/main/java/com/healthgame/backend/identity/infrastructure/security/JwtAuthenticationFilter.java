package com.healthgame.backend.identity.infrastructure.security;

import com.healthgame.backend.identity.infrastructure.persistence.UserEntity;
import com.healthgame.backend.identity.infrastructure.persistence.UserRepository;
import com.healthgame.backend.identity.infrastructure.persistence.UserRoleJdbcRepository;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.List;
import org.springframework.http.HttpHeaders;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private static final String BEARER_PREFIX = "Bearer ";

    private final JwtTokenService jwtTokenService;
    private final UserRepository userRepository;
    private final UserRoleJdbcRepository userRoleJdbcRepository;

    public JwtAuthenticationFilter(
            JwtTokenService jwtTokenService,
            UserRepository userRepository,
            UserRoleJdbcRepository userRoleJdbcRepository
    ) {
        this.jwtTokenService = jwtTokenService;
        this.userRepository = userRepository;
        this.userRoleJdbcRepository = userRoleJdbcRepository;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        String authHeader = request.getHeader(HttpHeaders.AUTHORIZATION);

        if (authHeader == null || !authHeader.startsWith(BEARER_PREFIX)) {
            filterChain.doFilter(request, response);
            return;
        }

        String token = authHeader.substring(BEARER_PREFIX.length());
        if (!jwtTokenService.isValid(token) || !"access".equals(jwtTokenService.extractTokenType(token))) {
            filterChain.doFilter(request, response);
            return;
        }

        if (SecurityContextHolder.getContext().getAuthentication() == null) {
            Long userId = jwtTokenService.extractUserId(token);
            UserEntity user = userRepository.findById(userId).orElse(null);
            if (user == null || !"active".equalsIgnoreCase(user.getStatus())) {
                filterChain.doFilter(request, response);
                return;
            }

            List<String> roles = userRoleJdbcRepository.findRoleCodesByUserId(userId);
            AuthenticatedUser principal = AuthenticatedUser.user(userId, user.getEmail(), roles);
            UsernamePasswordAuthenticationToken authentication = new UsernamePasswordAuthenticationToken(
                    principal,
                    null,
                    principal.authorities()
            );
            authentication.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
            SecurityContextHolder.getContext().setAuthentication(authentication);
        }

        filterChain.doFilter(request, response);
    }
}