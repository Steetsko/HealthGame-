package com.healthgame.backend.notifications.infrastructure.persistence;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface NotificationRepository extends JpaRepository<NotificationEntity, Long> {

    List<NotificationEntity> findByRecipientIdOrderByCreatedAtDesc(Long recipientId);

    long countByRecipientIdAndReadFalse(Long recipientId);

    Optional<NotificationEntity> findByIdAndRecipientId(Long id, Long recipientId);

    List<NotificationEntity> findByRecipientIdAndReadFalseOrderByCreatedAtDesc(Long recipientId);
}
