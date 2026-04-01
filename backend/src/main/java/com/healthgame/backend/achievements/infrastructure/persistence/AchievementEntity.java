package com.healthgame.backend.achievements.infrastructure.persistence;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "achievements")
public class AchievementEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(nullable = false, unique = true, length = 64)
    private String code;

    @Column(nullable = false, length = 140)
    private String name;

    @Column(nullable = false, length = 1000)
    private String description;

    @Column(length = 128)
    private String icon;

    @Column(nullable = false, length = 16)
    private String rarity;

    @Column(name = "is_active", nullable = false)
    private boolean active;

    public Integer getId() { return id; }
    public String getCode() { return code; }
    public String getName() { return name; }
    public String getDescription() { return description; }
    public String getIcon() { return icon; }
    public String getRarity() { return rarity; }
    public boolean isActive() { return active; }
}