package com.healthgame.backend.identity.application;

import com.healthgame.backend.identity.infrastructure.persistence.RefreshTokenEntity;
import com.healthgame.backend.identity.infrastructure.persistence.RefreshTokenRepository;
import com.healthgame.backend.identity.infrastructure.persistence.UserEntity;
import com.healthgame.backend.identity.infrastructure.persistence.UserRepository;
import com.healthgame.backend.identity.infrastructure.persistence.UserRoleJdbcRepository;
import com.healthgame.backend.identity.infrastructure.security.AuthenticatedUser;
import com.healthgame.backend.identity.infrastructure.security.JwtProperties;
import com.healthgame.backend.identity.infrastructure.security.JwtTokenService;
import com.healthgame.backend.identity.infrastructure.security.TokenHashService;
import com.healthgame.backend.shared.domain.ConflictException;
import com.healthgame.backend.shared.domain.ResourceNotFoundException;
import io.jsonwebtoken.JwtException;
import jakarta.transaction.Transactional;
import java.time.Instant;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
public class AuthApplicationService {

    private final UserRepository userRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final UserRoleJdbcRepository userRoleJdbcRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenService jwtTokenService;
    private final JwtProperties jwtProperties;
    private final TokenHashService tokenHashService;

    public AuthApplicationService(
            UserRepository userRepository,
            RefreshTokenRepository refreshTokenRepository,
            UserRoleJdbcRepository userRoleJdbcRepository,
            PasswordEncoder passwordEncoder,
            JwtTokenService jwtTokenService,
            JwtProperties jwtProperties,
            TokenHashService tokenHashService
    ) {
        this.userRepository = userRepository;
        this.refreshTokenRepository = refreshTokenRepository;
        this.userRoleJdbcRepository = userRoleJdbcRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtTokenService = jwtTokenService;
        this.jwtProperties = jwtProperties;
        this.tokenHashService = tokenHashService;
    }

    @Transactional
    public RegisteredUserResponse register(RegisterRequest request) {
        if (userRepository.existsByEmailIgnoreCase(request.email())) {
            throw new ConflictException("Email is already registered");
        }
        if (userRepository.existsByNicknameIgnoreCase(request.nickname())) {
            throw new ConflictException("Nickname is already registered");
        }

        UserEntity entity = new UserEntity();
        entity.setEmail(request.email().trim().toLowerCase());
        entity.setPhone(request.phone());
        entity.setPasswordHash(passwordEncoder.encode(request.password()));
        entity.setNickname(request.nickname().trim());
        entity.setFirstName(request.firstName());
        entity.setTimezone(request.timezone());
        entity.setStatus("active");
        entity.setRegisteredAt(Instant.now());

        UserEntity saved = userRepository.save(entity);
        userRoleJdbcRepository.assignDefaultUserRole(saved.getId());
        return new RegisteredUserResponse(saved.getId(), saved.getEmail(), saved.getNickname(), saved.getTimezone());
    }

    @Transactional
    public AuthResponse login(LoginRequest request) {
        UserEntity user = userRepository.findByEmailIgnoreCaseOrNicknameIgnoreCase(request.login().trim(), request.login().trim())
                .orElseThrow(() -> new ResourceNotFoundException("User with provided credentials was not found"));

        if (!passwordEncoder.matches(request.password(), user.getPasswordHash())) {
            throw new ConflictException("Invalid credentials");
        }

        user.setLastLoginAt(Instant.now());
        return issueTokenPair(user, null, null);
    }

    @Transactional
    public AuthResponse refresh(RefreshTokenRequest request) {
        String rawToken = request.refreshToken();
        validateRefreshTokenType(rawToken);

        String tokenHash = tokenHashService.hash(rawToken);
        RefreshTokenEntity storedToken = refreshTokenRepository.findByTokenHash(tokenHash)
                .orElseThrow(() -> new ResourceNotFoundException("Refresh token was not found"));

        if (storedToken.getRevokedAt() != null || storedToken.getExpiresAt().isBefore(Instant.now())) {
            throw new ConflictException("Refresh token is expired or revoked");
        }

        UserEntity user = userRepository.findById(storedToken.getUserId())
                .orElseThrow(() -> new ResourceNotFoundException("User for refresh token was not found"));

        storedToken.setRevokedAt(Instant.now());
        return issueTokenPair(user, storedToken.getDeviceInfo(), storedToken.getUserAgent());
    }

    @Transactional
    public void logout(AuthenticatedUser authenticatedUser, LogoutRequest request) {
        String tokenHash = tokenHashService.hash(request.refreshToken());
        RefreshTokenEntity token = refreshTokenRepository.findByTokenHash(tokenHash)
                .orElseThrow(() -> new ResourceNotFoundException("Refresh token was not found"));

        if (!token.getUserId().equals(authenticatedUser.userId())) {
            throw new ConflictException("Refresh token does not belong to the authenticated user");
        }

        token.setRevokedAt(Instant.now());
    }

    private AuthResponse issueTokenPair(UserEntity user, String deviceInfo, String userAgent) {
        String accessToken = jwtTokenService.createAccessToken(user.getId(), user.getEmail());
        String refreshToken = jwtTokenService.createRefreshToken(user.getId());

        RefreshTokenEntity tokenEntity = new RefreshTokenEntity();
        tokenEntity.setUserId(user.getId());
        tokenEntity.setTokenHash(tokenHashService.hash(refreshToken));
        tokenEntity.setDeviceInfo(deviceInfo);
        tokenEntity.setIpAddress(null);
        tokenEntity.setUserAgent(userAgent);
        tokenEntity.setCreatedAt(Instant.now());
        tokenEntity.setExpiresAt(jwtTokenService.extractExpiration(refreshToken));
        refreshTokenRepository.save(tokenEntity);

        return new AuthResponse(
                accessToken,
                refreshToken,
                jwtProperties.accessTokenExpiration().toSeconds(),
                jwtProperties.refreshTokenExpiration().toSeconds()
        );
    }

    private void validateRefreshTokenType(String rawToken) {
        try {
            String tokenType = jwtTokenService.extractTokenType(rawToken);
            if (!"refresh".equals(tokenType)) {
                throw new ConflictException("Provided token is not a refresh token");
            }
        } catch (JwtException | IllegalArgumentException exception) {
            throw new ConflictException("Refresh token is invalid");
        }
    }
}