package com.healthgame.backend;

import com.healthgame.backend.identity.infrastructure.security.JwtProperties;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.EnableConfigurationProperties;

@SpringBootApplication
@EnableConfigurationProperties(JwtProperties.class)
public class HealthGameBackendApplication {

    public static void main(String[] args) {
        SpringApplication.run(HealthGameBackendApplication.class, args);
    }
}
