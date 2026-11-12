package com.elif;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.annotation.EnableScheduling;  // ← AJOUTER CET IMPORT


@SpringBootApplication
@EnableAsync(proxyTargetClass = true)
@EnableScheduling  // ← AJOUTER CETTE LIGNE
public class BackendApplication {

    public static void main(String[] args) {
        SpringApplication.run(BackendApplication.class, args);
    }
}