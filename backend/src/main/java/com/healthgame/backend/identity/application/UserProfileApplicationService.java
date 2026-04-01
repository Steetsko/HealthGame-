package com.healthgame.backend.identity.application;

import com.healthgame.backend.identity.infrastructure.persistence.UserEntity;
import com.healthgame.backend.identity.infrastructure.persistence.UserRepository;
import com.healthgame.backend.identity.infrastructure.security.AuthenticatedUser;
import com.healthgame.backend.shared.domain.ConflictException;
import com.healthgame.backend.shared.domain.ResourceNotFoundException;
import org.springframework.stereotype.Service;

@Service
public class UserProfileApplicationService {

    private final UserRepository userRepository;

    public UserProfileApplicationService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    public CurrentUserResponse getCurrentUser(AuthenticatedUser authenticatedUser) {
        UserEntity user = getUser(authenticatedUser);
        return toResponse(user);
    }

    public CurrentUserResponse updateCurrentUser(AuthenticatedUser authenticatedUser, UpdateCurrentUserRequest request) {
        UserEntity user = getUser(authenticatedUser);

        String normalizedEmail = request.email().trim().toLowerCase();
        String normalizedNickname = request.nickname().trim();

        userRepository.findByEmailIgnoreCase(normalizedEmail)
                .filter(existing -> !existing.getId().equals(user.getId()))
                .ifPresent(existing -> { throw new ConflictException("Email is already registered"); });

        userRepository.findByNicknameIgnoreCase(normalizedNickname)
                .filter(existing -> !existing.getId().equals(user.getId()))
                .ifPresent(existing -> { throw new ConflictException("Nickname is already registered"); });

        user.setEmail(normalizedEmail);
        user.setNickname(normalizedNickname);
        user.setPhone(request.phone().trim());
        user.setFirstName(request.firstName().trim());
        user.setTimezone(request.timezone().trim());

        return toResponse(userRepository.save(user));
    }

    private UserEntity getUser(AuthenticatedUser authenticatedUser) {
        return userRepository.findById(authenticatedUser.userId())
                .orElseThrow(() -> new ResourceNotFoundException("Authenticated user was not found"));
    }

    private CurrentUserResponse toResponse(UserEntity user) {
        return new CurrentUserResponse(
                user.getId(),
                user.getEmail(),
                user.getPhone(),
                user.getNickname(),
                user.getFirstName(),
                user.getTimezone(),
                user.getStatus(),
                user.getRegisteredAt(),
                user.getLastLoginAt()
        );
    }
}