package com.healthgame.backend.integrations.infrastructure.persistence;

import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface IntegrationTokenRepository extends JpaRepository<IntegrationTokenEntity, Long> {

    Optional<IntegrationTokenEntity> findByIntegrationId(Long integrationId);

    void deleteByIntegrationId(Long integrationId);
}
