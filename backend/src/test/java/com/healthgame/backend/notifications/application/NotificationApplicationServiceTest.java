package com.healthgame.backend.notifications.application;

import com.healthgame.backend.identity.infrastructure.security.AuthenticatedUser;
import com.healthgame.backend.notifications.infrastructure.persistence.NotificationEntity;
import com.healthgame.backend.notifications.infrastructure.persistence.NotificationRepository;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Captor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class NotificationApplicationServiceTest {

    @Mock
    private NotificationRepository notificationRepository;

    @InjectMocks
    private NotificationApplicationService notificationApplicationService;

    @Captor
    private ArgumentCaptor<NotificationEntity> notificationCaptor;

    @Test
    void markAllReadMarksUnreadNotificationsAndReturnsZeroCount() {
        NotificationEntity first = new NotificationEntity();
        first.setRead(false);
        NotificationEntity second = new NotificationEntity();
        second.setRead(false);

        when(notificationRepository.findByRecipientIdAndReadFalseOrderByCreatedAtDesc(6L)).thenReturn(List.of(first, second));

        UnreadNotificationCountResponse response = notificationApplicationService.markAllRead(new AuthenticatedUser(6L, "user@example.com", List.of()));

        assertThat(response.unreadCount()).isZero();
        assertThat(first.isRead()).isTrue();
        assertThat(second.isRead()).isTrue();
        assertThat(first.getReadAt()).isNotNull();
        assertThat(second.getReadAt()).isNotNull();
    }

    @Test
    void markReadUpdatesSingleNotification() {
        NotificationEntity notification = new NotificationEntity();
        ReflectionTestUtils.setField(notification, "id", 4L);
        notification.setRecipientId(2L);
        notification.setType("SYSTEM");
        notification.setTitle("Title");
        notification.setMessage("Message");
        notification.setCreatedAt(Instant.parse("2026-05-01T10:15:30Z"));
        notification.setRead(false);

        when(notificationRepository.findByIdAndRecipientId(4L, 2L)).thenReturn(Optional.of(notification));

        NotificationResponse response = notificationApplicationService.markRead(new AuthenticatedUser(2L, "user@example.com", List.of()), 4L);

        assertThat(response.isRead()).isTrue();
        assertThat(notification.getReadAt()).isNotNull();
    }

    @Test
    void notifyAchievementUnlockedCreatesPersistedNotification() {
        notificationApplicationService.notifyAchievementUnlocked(8L, "Первый шаг", "/dashboard");

        verify(notificationRepository).save(notificationCaptor.capture());
        NotificationEntity saved = notificationCaptor.getValue();
        assertThat(saved.getRecipientId()).isEqualTo(8L);
        assertThat(saved.getType()).isEqualTo("ACHIEVEMENT_UNLOCKED");
        assertThat(saved.getTitle()).isEqualTo("Достижение получено");
        assertThat(saved.getMessage()).contains("Первый шаг");
        assertThat(saved.getTargetUrl()).isEqualTo("/dashboard");
    }
}
