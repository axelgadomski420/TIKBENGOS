package com.elif.dto.events.response;

import lombok.*;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class WeatherResponse {

    private double      temperature;      // en °C
    private String      description;      // ex: "ciel dégagé"
    private String      icon;             // code icône OpenWeatherMap
    private int         humidity;         // en %
    private double      windSpeed;        // en km/h
    private String      condition;        // SUNNY, CLOUDY, RAINY, STORMY, SNOWY

    // ✅ Recommandation indoor/outdoor
    private String      recommendation;   // "INDOOR" ou "OUTDOOR"
    private String      recommendationMsg;// message lisible
    private boolean     eventDay;         // true si c'est le jour J
    private String      city;
}

