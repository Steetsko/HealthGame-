package com.healthgame.backend.identity.infrastructure.security;

import com.healthgame.backend.identity.application.AuthResponse;
import com.healthgame.backend.integrations.application.GoogleIntegrationApplicationService;
import com.healthgame.backend.shared.domain.ConflictException;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.client.OAuth2AuthorizedClient;
import org.springframework.security.oauth2.client.OAuth2AuthorizedClientService;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.security.web.authentication.AuthenticationSuccessHandler;
import org.springframework.stereotype.Component;
import org.springframework.web.util.UriComponentsBuilder;

@Component
public class OAuth2LoginSuccessHandler implements AuthenticationSuccessHandler {

    private static final Logger log = LoggerFactory.getLogger(OAuth2LoginSuccessHandler.class);

    private final GoogleIntegrationApplicationService googleIntegrationApplicationService;
    private final OAuth2AuthorizedClientService authorizedClientService;
    private final JwtTokenService jwtTokenService;
    private final String frontendBaseUrl;

    public OAuth2LoginSuccessHandler(
            GoogleIntegrationApplicationService googleIntegrationApplicationService,
            OAuth2AuthorizedClientService authorizedClientService,
            JwtTokenService jwtTokenService,
            @Value("${app.frontend.base-url:http://localhost:5173}") String frontendBaseUrl
    ) {
        this.googleIntegrationApplicationService = googleIntegrationApplicationService;
        this.authorizedClientService = authorizedClientService;
        this.jwtTokenService = jwtTokenService;
        this.frontendBaseUrl = frontendBaseUrl;
    }

    @Override
    public void onAuthenticationSuccess(HttpServletRequest request, HttpServletResponse response, Authentication authentication) throws IOException, ServletException {
        OAuth2AuthenticationToken token = (OAuth2AuthenticationToken) authentication;
        OAuth2User principal = token.getPrincipal();
        OAuth2AuthorizedClient client = authorizedClientService.loadAuthorizedClient(token.getAuthorizedClientRegistrationId(), token.getName());
        if (client == null) {
            log.error("Google OAuth login failed: authorized client not found for registrationId={}, principalName={}", token.getAuthorizedClientRegistrationId(), token.getName());
            throw new ConflictException("Google authorized client is missing");
        }

        log.info("Google OAuth success callback received: principalName={}, attributes={}", token.getName(), principal.getAttributes().keySet());

        String googleConnectToken = extractAndClearGoogleConnectToken(request);
        if (googleConnectToken != null && jwtTokenService.isValid(googleConnectToken) && "google_connect".equals(jwtTokenService.extractTokenType(googleConnectToken))) {
            Long userId = jwtTokenService.extractUserId(googleConnectToken);
            String redirectPath = normalizeFrontendPath(jwtTokenService.extractRedirectPath(googleConnectToken));
            googleIntegrationApplicationService.connectGoogleCalendar(userId, principal, client);
            String redirectUrl = UriComponentsBuilder.fromHttpUrl(frontendBaseUrl + redirectPath)
                    .queryParam("googleConnected", "1")
                    .build(true)
                    .toUriString();
            response.sendRedirect(redirectUrl);
            return;
        }

        AuthResponse authResponse = googleIntegrationApplicationService.handleGoogleLogin(principal, client);

        String redirectUrl = UriComponentsBuilder.fromHttpUrl(frontendBaseUrl + "/login")
                .queryParam("accessToken", authResponse.accessToken())
                .queryParam("refreshToken", authResponse.refreshToken())
                .queryParam("expiresInSeconds", authResponse.accessTokenExpiresInSeconds())
                .queryParam("refreshExpiresInSeconds", authResponse.refreshTokenExpiresInSeconds())
                .build(true)
                .toUriString();
        response.sendRedirect(redirectUrl);
    }

    private String extractAndClearGoogleConnectToken(HttpServletRequest request) {
        if (request.getSession(false) == null) {
            return null;
        }
        Object value = request.getSession(false).getAttribute(SecurityConfig.GOOGLE_CONNECT_TOKEN_SESSION_KEY);
        request.getSession(false).removeAttribute(SecurityConfig.GOOGLE_CONNECT_TOKEN_SESSION_KEY);
        return value instanceof String stringValue && !stringValue.isBlank() ? stringValue : null;
    }

    private String normalizeFrontendPath(String path) {
        if (path == null || path.isBlank()) {
            return "/extras/calendar";
        }
        String value = path.startsWith("/") ? path : "/" + path;
        return value.startsWith("//") ? "/extras/calendar" : value;
    }
}
