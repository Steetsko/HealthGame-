package com.healthgame.backend.shared.audit;

import java.lang.reflect.Method;
import java.util.Arrays;
import java.util.Optional;
import java.util.function.Supplier;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

@Component
public class AuditTrailService {

    private static final Logger log = LoggerFactory.getLogger(AuditTrailService.class);

    public <T> T execute(Object target, String methodName, Supplier<T> action) {
        AuditAction metadata = resolveAuditAction(target, methodName);
        log.info("AUDIT start: domain={}, action={}", metadata.domain(), metadata.value());
        try {
            T result = action.get();
            log.info("AUDIT success: domain={}, action={}", metadata.domain(), metadata.value());
            return result;
        } catch (RuntimeException exception) {
            log.warn("AUDIT failure: domain={}, action={}, message={}", metadata.domain(), metadata.value(), exception.getMessage());
            throw exception;
        }
    }

    public void execute(Object target, String methodName, Runnable action) {
        execute(target, methodName, () -> {
            action.run();
            return null;
        });
    }

    private AuditAction resolveAuditAction(Object target, String methodName) {
        Method method = Arrays.stream(target.getClass().getMethods())
                .filter(candidate -> candidate.getName().equals(methodName))
                .findFirst()
                .orElseThrow(() -> new IllegalStateException("Audited method not found: " + methodName));
        return Optional.ofNullable(method.getAnnotation(AuditAction.class))
                .orElseThrow(() -> new IllegalStateException("AuditAction annotation is missing on method: " + methodName));
    }
}
