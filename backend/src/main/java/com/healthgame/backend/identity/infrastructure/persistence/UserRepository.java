package com.healthgame.backend.identity.infrastructure.persistence;

import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UserRepository extends JpaRepository<UserEntity, Long> {

    boolean existsByEmailIgnoreCase(String email);

    boolean existsByNicknameIgnoreCase(String nickname);

    Optional<UserEntity> findByEmailIgnoreCase(String email);

    Optional<UserEntity> findByNicknameIgnoreCase(String nickname);

    Optional<UserEntity> findByEmailIgnoreCaseOrNicknameIgnoreCase(String email, String nickname);
}