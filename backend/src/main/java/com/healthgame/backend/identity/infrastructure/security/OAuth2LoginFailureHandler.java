package com.healthgame.backend.identity.infrastructure.security;

import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.web.authentication.AuthenticationFailureHandler;
import org.springframework.stereotype.Component;
import org.springframework.web.util.UriComponentsBuilder;

@Component
public class OAuth2LoginFailureHandler implements AuthenticationFailureHandler {

    private static final Logger log = LoggerFactory.getLogger(OAuth2LoginFailureHandler.class);

    private final String frontendBaseUrl;

    public OAuth2LoginFailureHandler(@Value("${app.frontend.base-url:http://localhost:5173}") String frontendBaseUrl) {
        this.frontendBaseUrl = frontendBaseUrl;
    }

    @Override
    public void onAuthenticationFailure(HttpServletRequest request, HttpServletResponse response, AuthenticationException exception) throws IOException, ServletException {
        log.error("Google OAuth login failed: type={}, message={}", exception.getClass().getName(), exception.getMessage(), exception);

        String connectToken = extractAndClearGoogleConnectToken(request);
        if (connectToken != null) {
            String redirectPath = normalizeFrontendPath("/extras/calendar");
            String redirectUrl = UriComponentsBuilder.fromHttpUrl(frontendBaseUrl + redirectPath)
                    .queryParam("googleError", "connect_failed")
                    .build(true)
                    .toUriString();
            response.sendRedirect(redirectUrl);
            return;
        }

        String redirectUrl = UriComponentsBuilder.fromHttpUrl(frontendBaseUrl + "/login")
                .queryParam("oauthError", "google_login_failed")
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
