package com.elif.services.events.implementations;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.UUID;

@Service
@Slf4j
public class ImageUploadService {

    // ✅ Utiliser le même dossier que la config
    private static final String UPLOAD_DIR = "uploads/";

    public String uploadEventImage(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            return null;
        }

        try {
            String contentType = file.getContentType();
            if (contentType == null || !contentType.startsWith("image/")) {
                throw new RuntimeException("Only image files are allowed");
            }

            String originalFilename = file.getOriginalFilename();
            String extension = originalFilename != null && originalFilename.contains(".")
                    ? originalFilename.substring(originalFilename.lastIndexOf("."))
                    : ".jpg";

            // ✅ Préfixe pour identifier les images d'événements
            String filename = "event_" + UUID.randomUUID().toString() + extension;

            Path uploadPath = Paths.get(UPLOAD_DIR);
            if (!Files.exists(uploadPath)) {
                Files.createDirectories(uploadPath);
            }

            Path filePath = uploadPath.resolve(filename);
            Files.copy(file.getInputStream(), filePath);

            log.info("Event image uploaded: {}", filename);

            // ✅ Retourner l'URL relative (sera servie par ta config)
            return "/uploads/" + filename;

        } catch (IOException e) {
            log.error("Failed to upload event image", e);
            throw new RuntimeException("Failed to upload image", e);
        }
    }

    public void deleteEventImage(String imageUrl) {
        if (imageUrl == null || !imageUrl.contains("/uploads/")) {
            return;
        }

        try {
            String filename = imageUrl.substring(imageUrl.lastIndexOf("/") + 1);
            Path filePath = Paths.get(UPLOAD_DIR).resolve(filename);

            if (Files.exists(filePath)) {
                Files.delete(filePath);
                log.info("Event image deleted: {}", filename);
            }
        } catch (IOException e) {
            log.error("Failed to delete event image", e);
        }
    }
}