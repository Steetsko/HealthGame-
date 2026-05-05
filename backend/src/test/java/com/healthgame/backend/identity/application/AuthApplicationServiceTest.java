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
import io.jsonwebtoken.JwtException;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Captor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AuthApplicationServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private RefreshTokenRepository refreshTokenRepository;

    @Mock
    private UserRoleJdbcRepository userRoleJdbcRepository;

    @Mock
    private org.springframework.security.crypto.password.PasswordEncoder passwordEncoder;

    @Mock
    private JwtTokenService jwtTokenService;

    @Mock
    private JwtProperties jwtProperties;

    @Mock
    private TokenHashService tokenHashService;

    @InjectMocks
    private AuthApplicationService authApplicationService;

    @Captor
    private ArgumentCaptor<UserEntity> userCaptor;

    @Captor
    private ArgumentCaptor<RefreshTokenEntity> refreshTokenCaptor;

    @Test
    void registerSavesNormalizedUserAndAssignsDefaultRole() {
        RegisterRequest request = new RegisterRequest(" User@Example.com ", "+375291112233", "Password123", "nick", "Alice", "Europe/Minsk");
        UserEntity savedUser = new UserEntity();
        ReflectionTestUtils.setField(savedUser, "id", 42L);
        savedUser.setEmail("user@example.com");
        savedUser.setNickname("nick");
        savedUser.setTimezone("Europe/Minsk");

        when(userRepository.existsByEmailIgnoreCase(request.email())).thenReturn(false);
        when(userRepository.existsByNicknameIgnoreCase(request.nickname())).thenReturn(false);
        when(passwordEncoder.encode(request.password())).thenReturn("encoded");
        when(userRepository.save(userCaptor.capture())).thenReturn(savedUser);

        RegisteredUserResponse response = authApplicationService.register(request);

        assertThat(response.id()).isEqualTo(42L);
        assertThat(response.email()).isEqualTo("user@example.com");
        assertThat(userCaptor.getValue().getEmail()).isEqualTo("user@example.com");
        assertThat(userCaptor.getValue().getPasswordHash()).isEqualTo("encoded");
        verify(userRoleJdbcRepository).assignDefaultUserRole(42L);
    }

    @Test
    void loginRejectsInvalidPassword() {
        UserEntity user = activeUser(7L);
        user.setPasswordHash("encoded");
        when(userRepository.findByEmailIgnoreCaseOrNicknameIgnoreCase("tester", "tester")).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("wrong", "encoded")).thenReturn(false);

        assertThatThrownBy(() -> authApplicationService.login(new LoginRequest("tester", "wrong")))
                .isInstanceOf(ConflictException.class)
                .hasMessage("Invalid credentials");
    }

    @Test
    void refreshRotatesTokenAndPersistsReplacementPair() {
        RefreshTokenRequest request = new RefreshTokenRequest("refresh-token");
        RefreshTokenEntity stored = new RefreshTokenEntity();
        ReflectionTestUtils.setField(stored, "id", 5L);
        stored.setUserId(11L);
        stored.setTokenHash("hash");
        stored.setDeviceInfo("Chrome");
        stored.setUserAgent("UA");
        stored.setExpiresAt(Instant.now().plusSeconds(600));

        UserEntity user = activeUser(11L);

        when(jwtProperties.accessTokenExpiration()).thenReturn(Duration.ofMinutes(15));
        when(jwtProperties.refreshTokenExpiration()).thenReturn(Duration.ofDays(14));
        when(jwtTokenService.extractTokenType("refresh-token")).thenReturn("refresh");
        when(tokenHashService.hash("refresh-token")).thenReturn("hash");
        when(refreshTokenRepository.findByTokenHash("hash")).thenReturn(Optional.of(stored));
        when(userRepository.findById(11L)).thenReturn(Optional.of(user));
        when(jwtTokenService.createAccessToken(11L, user.getEmail())).thenReturn("new-access");
        when(jwtTokenService.createRefreshToken(11L)).thenReturn("new-refresh");
        when(tokenHashService.hash("new-refresh")).thenReturn("new-hash");
        when(jwtTokenService.extractExpiration("new-refresh")).thenReturn(Instant.now().plusSeconds(3600));

        AuthResponse response = authApplicationService.refresh(request);

        assertThat(response.accessToken()).isEqualTo("new-access");
        assertThat(response.refreshToken()).isEqualTo("new-refresh");
        assertThat(stored.getRevokedAt()).isNotNull();
        verify(refreshTokenRepository).save(refreshTokenCaptor.capture());
        assertThat(refreshTokenCaptor.getValue().getTokenHash()).isEqualTo("new-hash");
        assertThat(refreshTokenCaptor.getValue().getUserId()).isEqualTo(11L);
    }

    @Test
    void refreshRejectsTokenWithUnexpectedType() {
        when(jwtTokenService.extractTokenType("access-token")).thenReturn("access");

        assertThatThrownBy(() -> authApplicationService.refresh(new RefreshTokenRequest("access-token")))
                .isInstanceOf(ConflictException.class)
                .hasMessage("Provided token is not a refresh token");
    }

    @Test
    void refreshRejectsMalformedToken() {
        when(jwtTokenService.extractTokenType("broken")).thenThrow(new JwtException("broken"));

        assertThatThrownBy(() -> authApplicationService.refresh(new RefreshTokenRequest("broken")))
                .isInstanceOf(ConflictException.class)
                .hasMessage("Refresh token is invalid");
    }

    @Test
    void logoutRejectsForeignRefreshToken() {
        AuthenticatedUser authenticatedUser = new AuthenticatedUser(1L, "user@example.com", List.of());
        RefreshTokenEntity stored = new RefreshTokenEntity();
        stored.setUserId(2L);

        when(tokenHashService.hash("refresh-token")).thenReturn("hash");
        when(refreshTokenRepository.findByTokenHash("hash")).thenReturn(Optional.of(stored));

        assertThatThrownBy(() -> authApplicationService.logout(authenticatedUser, new LogoutRequest("refresh-token")))
                .isInstanceOf(ConflictException.class)
                .hasMessage("Refresh token does not belong to the authenticated user");

        verify(refreshTokenRepository, never()).save(org.mockito.ArgumentMatchers.any());
    }

    private UserEntity activeUser(Long id) {
        UserEntity user = new UserEntity();
        ReflectionTestUtils.setField(user, "id", id);
        user.setEmail("user@example.com");
        user.setStatus("active");
        return user;
    }
}
