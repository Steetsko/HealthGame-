package com.healthgame.backend.integrations.infrastructure.persistence;

import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ExternalIntegrationRepository extends JpaRepository<ExternalIntegrationEntity, Long> {

    Optional<ExternalIntegrationEntity> findByUserIdAndProvider(Long userId, String provider);

    Optional<ExternalIntegrationEntity> findByProviderAndExternalUser(String provider, String externalUser);
}