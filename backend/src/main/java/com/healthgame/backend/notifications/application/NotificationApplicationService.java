package com.healthgame.backend.notifications.application;

import com.healthgame.backend.identity.infrastructure.security.AuthenticatedUser;
import com.healthgame.backend.notifications.infrastructure.persistence.NotificationEntity;
import com.healthgame.backend.notifications.infrastructure.persistence.NotificationRepository;
import com.healthgame.backend.shared.domain.ResourceNotFoundException;
import jakarta.transaction.Transactional;
import java.time.Instant;
import java.util.List;
import org.springframework.stereotype.Service;

@Service
public class NotificationApplicationService {

    private final NotificationRepository notificationRepository;

    public NotificationApplicationService(NotificationRepository notificationRepository) {
        this.notificationRepository = notificationRepository;
    }

    public List<NotificationResponse> getMyNotifications(AuthenticatedUser authenticatedUser) {
        return notificationRepository.findByRecipientIdOrderByCreatedAtDesc(authenticatedUser.userId()).stream()
                .map(this::toResponse)
                .toList();
    }

    public UnreadNotificationCountResponse getUnreadCount(AuthenticatedUser authenticatedUser) {
        return new UnreadNotificationCountResponse(
                notificationRepository.countByRecipientIdAndReadFalse(authenticatedUser.userId())
        );
    }

    @Transactional
    public NotificationResponse markRead(AuthenticatedUser authenticatedUser, Long notificationId) {
        NotificationEntity entity = notificationRepository.findByIdAndRecipientId(notificationId, authenticatedUser.userId())
                .orElseThrow(() -> new ResourceNotFoundException("Уведомление не найдено"));
        if (!entity.isRead()) {
            entity.setRead(true);
            entity.setReadAt(Instant.now());
        }
        return toResponse(entity);
    }

    @Transactional
    public UnreadNotificationCountResponse markAllRead(AuthenticatedUser authenticatedUser) {
        List<NotificationEntity> unreadNotifications = notificationRepository
                .findByRecipientIdAndReadFalseOrderByCreatedAtDesc(authenticatedUser.userId());
        Instant now = Instant.now();
        unreadNotifications.forEach(notification -> {
            notification.setRead(true);
            notification.setReadAt(now);
        });
        return new UnreadNotificationCountResponse(0);
    }

    @Transactional
    public void deleteNotification(AuthenticatedUser authenticatedUser, Long notificationId) {
        NotificationEntity entity = notificationRepository.findByIdAndRecipientId(notificationId, authenticatedUser.userId())
                .orElseThrow(() -> new ResourceNotFoundException("Уведомление не найдено"));
        notificationRepository.delete(entity);
    }

    @Transactional
    public void notifyBlogRecommendation(Long recipientId, Long actorId, String actorName, String postTitle, String targetUrl) {
        createNotification(
                recipientId,
                actorId,
                "BLOG_RECOMMENDATION",
                "Новая рекомендация",
                actorName + " рекомендовал вашу запись «" + postTitle + "».",
                targetUrl
        );
    }

    @Transactional
    public void notifyAchievementUnlocked(Long recipientId, String achievementTitle, String targetUrl) {
        createNotification(
                recipientId,
                null,
                "ACHIEVEMENT_UNLOCKED",
                "Достижение получено",
                "Вы открыли достижение «" + achievementTitle + "».",
                targetUrl
        );
    }

    @Transactional
    public void notifyXpGained(Long recipientId, int xpAmount, String targetUrl) {
        createNotification(
                recipientId,
                null,
                "XP_GAINED",
                "Получен опыт",
                "Вы получили " + xpAmount + " XP.",
                targetUrl
        );
    }

    @Transactional
    public void notifySystem(Long recipientId, String title, String message, String targetUrl) {
        createNotification(recipientId, null, "SYSTEM", title, message, targetUrl);
    }

    private void createNotification(Long recipientId, Long actorId, String type, String title, String message, String targetUrl) {
        NotificationEntity entity = new NotificationEntity();
        entity.setRecipientId(recipientId);
        entity.setActorId(actorId);
        entity.setType(type);
        entity.setTitle(title);
        entity.setMessage(message);
        entity.setTargetUrl(targetUrl);
        entity.setRead(false);
        entity.setCreatedAt(Instant.now());
        entity.setReadAt(null);
        notificationRepository.save(entity);
    }

    private NotificationResponse toResponse(NotificationEntity entity) {
        return new NotificationResponse(
                entity.getId(),
                entity.getActorId(),
                entity.getType(),
                entity.getTitle(),
                entity.getMessage(),
                entity.getTargetUrl(),
                entity.isRead(),
                entity.getCreatedAt(),
                entity.getReadAt()
        );
    }
}
