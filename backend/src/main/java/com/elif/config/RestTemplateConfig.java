package com.elif.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.web.client.RestTemplate;

/**
 * ✅ Bean RestTemplate avec timeouts pour les appels Gemini.
 * À ajouter dans ton package config/ si tu n'en as pas déjà un.
 */
@Configuration
public class RestTemplateConfig {

    @Bean
    public RestTemplate restTemplate() {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(10_000); // 10 secondes pour se connecter
        factory.setReadTimeout(30_000);    // 30 secondes pour lire la réponse
        return new RestTemplate(factory);
    }
}