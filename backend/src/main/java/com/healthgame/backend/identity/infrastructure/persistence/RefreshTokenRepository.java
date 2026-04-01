package com.healthgame.backend.identity.infrastructure.persistence;

import java.time.Instant;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface RefreshTokenRepository extends JpaRepository<RefreshTokenEntity, Long> {

    Optional<RefreshTokenEntity> findByTokenHash(String tokenHash);

    @Modifying
    @Query("update RefreshTokenEntity token set token.revokedAt = :revokedAt where token.id = :id and token.revokedAt is null")
    int revokeById(@Param("id") Long id, @Param("revokedAt") Instant revokedAt);

    @Modifying
    @Query("update RefreshTokenEntity token set token.revokedAt = :revokedAt where token.userId = :userId and token.revokedAt is null")
    int revokeAllActiveByUserId(@Param("userId") Long userId, @Param("revokedAt") Instant revokedAt);
}