package com.elif.services.events.interfaces;

import com.elif.dto.events.response.WeatherResponse;

import java.time.LocalDateTime;

public interface IWeatherService {
    WeatherResponse getWeatherForEvent(Long eventId);
    WeatherResponse getWeatherByCity(String city, LocalDateTime eventDate);
}
