package com.healthgame.backend.integration;

import com.fasterxml.jackson.databind.JsonNode;
import com.healthgame.backend.habits.infrastructure.persistence.HabitCategoryEntity;
import com.healthgame.backend.habits.infrastructure.persistence.HabitCategoryRepository;
import com.healthgame.backend.habits.infrastructure.persistence.HabitCheckinRepository;
import com.healthgame.backend.habits.infrastructure.persistence.HabitRepository;
import com.healthgame.backend.support.IntegrationTestSupport;
import java.time.LocalDate;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MvcResult;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class HabitFlowIntegrationTest extends IntegrationTestSupport {

    @Autowired
    private HabitRepository habitRepository;

    @Autowired
    private HabitCategoryRepository habitCategoryRepository;

    @Autowired
    private HabitCheckinRepository habitCheckinRepository;

    @Test
    void authenticatedUserCanCreateHabitListItAndAddCheckin() throws Exception {
        AuthTokens tokens = registerAndLogin();
        LocalDate today = LocalDate.now();
        int categoryId = ensureCategory();

        MvcResult createHabitResult = mockMvc.perform(post("/api/v1/habits")
                        .header("Authorization", "Bearer " + tokens.accessToken())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "categoryId": %s,
                                  "name": "Morning water",
                                  "description": "Drink water after wake up",
                                  "startDate": "%s",
                                  "endDate": null,
                                  "targetValue": 1,
                                  "unit": "glass",
                                  "frequency": "DAILY",
                                  "isActive": true,
                                  "schedules": [
                                    {
                                      "dayOfWeek": null,
                                      "timeOfDay": "08:00:00",
                                      "minTimesPerDay": 1,
                                      "isEnabled": true
                                    }
                                  ]
                                }
                                """.formatted(categoryId, today)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.name").value("Morning water"))
                .andExpect(jsonPath("$.categoryName").isNotEmpty())
                .andReturn();

        JsonNode createdHabit = readBody(createHabitResult);
        long habitId = createdHabit.path("id").asLong();

        mockMvc.perform(get("/api/v1/habits")
                        .header("Authorization", "Bearer " + tokens.accessToken()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].id").value(habitId))
                .andExpect(jsonPath("$.content[0].name").value("Morning water"));

        mockMvc.perform(post("/api/v1/habits/{habitId}/checkins", habitId)
                        .header("Authorization", "Bearer " + tokens.accessToken())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "checkinDate": "%s",
                                  "value": 1,
                                  "comment": "Done",
                                  "source": "manual"
                                }
                                """.formatted(today)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.habitId").value(habitId))
                .andExpect(jsonPath("$.source").value("manual"));

        mockMvc.perform(get("/api/v1/habits/today")
                        .header("Authorization", "Bearer " + tokens.accessToken()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value(habitId))
                .andExpect(jsonPath("$[0].completedToday").value(true));

        assertThat(habitRepository.findById(habitId)).isPresent();
        assertThat(habitCheckinRepository.findByHabitIdAndCheckinDateBetweenOrderByCheckinDateAsc(habitId, today, today)).hasSize(1);
    }

    private int ensureCategory() {
        HabitCategoryEntity category = new HabitCategoryEntity();
        category.setName("Hydration");
        category.setDescription("Hydration habits");
        category.setIcon("water");
        return habitCategoryRepository.save(category).getId();
    }
}
