package com.elif.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

/**
 * Configuration Groq API
 *
 * Dans application.yml :
 *
 * groq:
 *   api-key: ${GROQ_API_KEY}
 *   api-url: https://api.groq.com/openai/v1
 *   model: llama-3.3-70b-versatile
 *   timeout-seconds: 25
 */
@Configuration
@ConfigurationProperties(prefix = "groq")
@Data
public class GroqConfig {

    /**
     * Clé API Groq (depuis variable d'environnement GROQ_API_KEY)
     */
    private String apiKey;

    /**
     * URL de base de l'API Groq (compatible OpenAI)
     */
    private String apiUrl = "https://api.groq.com/openai/v1";

    /**
     * Modèle à utiliser
     * Options rapides : llama-3.1-8b-instant (ultra rapide)
     * Options puissantes : llama-3.3-70b-versatile (meilleur raisonnement)
     */
    private String model = "llama-3.3-70b-versatile";

    /**
     * Timeout en secondes
     */
    private int timeoutSeconds = 25;
}