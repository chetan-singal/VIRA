package com.vira.item;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(BikeController.class)
class BikeControllerTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private ObjectMapper objectMapper;
    @MockitoBean private BikeRepository bikes;

    @Test
    void create_returns_201() throws Exception {
        Bike saved = new Bike("Splendor");
        ReflectionTestUtils.setField(saved, "id", 1L);
        when(bikes.existsByNameIgnoreCase("Splendor")).thenReturn(false);
        when(bikes.save(any())).thenReturn(saved);

        mockMvc.perform(post("/api/bikes")
                        .contentType("application/json")
                        .content(objectMapper.writeValueAsString(new NameRequest("Splendor"))))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value(1))
                .andExpect(jsonPath("$.name").value("Splendor"));
    }

    @Test
    void duplicate_name_different_case_returns_409() throws Exception {
        when(bikes.existsByNameIgnoreCase(any())).thenReturn(true);

        mockMvc.perform(post("/api/bikes")
                        .contentType("application/json")
                        .content(objectMapper.writeValueAsString(new NameRequest("SPLENDOR"))))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("DUPLICATE_NAME"));
    }

    @Test
    void blank_name_returns_400_with_field_errors() throws Exception {
        mockMvc.perform(post("/api/bikes")
                        .contentType("application/json")
                        .content(objectMapper.writeValueAsString(new NameRequest(""))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fieldErrors[0].field").value("name"));
    }

    @Test
    void unknown_json_property_returns_400_malformed_request() throws Exception {
        mockMvc.perform(post("/api/bikes")
                        .contentType("application/json")
                        .content("{\"name\":\"Splendor\",\"extra\":\"oops\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("MALFORMED_REQUEST"));
    }
}