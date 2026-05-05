package com.healthgame.backend.shared.audit;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class AuditTrailServiceTest {

    private final AuditTrailService auditTrailService = new AuditTrailService();

    @Test
    void executeReturnsSupplierResultWhenMethodIsAnnotated() {
        TestTarget target = new TestTarget();

        String result = auditTrailService.execute(target, "annotatedAction", () -> "ok");

        assertThat(result).isEqualTo("ok");
    }

    @Test
    void executeRethrowsRuntimeExceptionFromSupplier() {
        TestTarget target = new TestTarget();

        assertThatThrownBy(() -> auditTrailService.execute(target, "annotatedAction", () -> {
            throw new IllegalArgumentException("boom");
        }))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("boom");
    }

    @Test
    void executeFailsWhenAnnotationIsMissing() {
        TestTarget target = new TestTarget();

        assertThatThrownBy(() -> auditTrailService.execute(target, "nonAnnotatedAction", () -> "x"))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("AuditAction annotation is missing");
    }

    static class TestTarget {

        @AuditAction(value = "run", domain = "tests")
        public void annotatedAction() {
        }

        public void nonAnnotatedAction() {
        }
    }
}
