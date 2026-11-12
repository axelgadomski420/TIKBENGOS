package com.elif.services.pet_transit;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.Objects;
import java.util.UUID;

@Service
public class LocalFileStorageService implements FileStorageService {

    private final Path baseUploadDir;
    private final Path destinationUploadDir;

    public LocalFileStorageService(@Value("${app.upload.base-dir:uploads}") String baseDir) {
        String normalizedBaseDir = baseDir == null ? "uploads" : baseDir.trim();
        if (normalizedBaseDir.isEmpty()) {
            normalizedBaseDir = "uploads";
        }

        this.baseUploadDir = Paths.get(normalizedBaseDir).toAbsolutePath().normalize();
        this.destinationUploadDir = Paths.get(normalizedBaseDir, "destinations").toAbsolutePath().normalize();
        try {
            Files.createDirectories(this.baseUploadDir);
            Files.createDirectories(this.destinationUploadDir);
        } catch (IOException e) {
            throw new UncheckedIOException("Could not initialize upload directory", e);
        }
    }

    @Override
    public String storeDestinationCover(MultipartFile file) {
        String originalName = Objects.requireNonNullElse(file.getOriginalFilename(), "file");
        String extension = extractExtension(originalName);
        String uniqueName = UUID.randomUUID() + (extension.isEmpty() ? "" : "." + extension);

        Path target = destinationUploadDir.resolve(uniqueName).normalize();
        try {
            Files.copy(file.getInputStream(), target, StandardCopyOption.REPLACE_EXISTING);
        } catch (IOException e) {
            throw new UncheckedIOException("Failed to store uploaded file", e);
        }

        return "/uploads/destinations/" + uniqueName;
    }

    @Override
    public String storeFile(MultipartFile file, String subfolder) {
        String originalName = Objects.requireNonNullElse(file.getOriginalFilename(), "file");
        String extension = extractExtension(originalName);
        String uniqueName = UUID.randomUUID() + (extension.isEmpty() ? "" : "." + extension);

        Path subfolderPath = baseUploadDir.resolve(subfolder).toAbsolutePath().normalize();
        try {
            Files.createDirectories(subfolderPath);
        } catch (IOException e) {
            throw new UncheckedIOException("Could not create subfolder", e);
        }

        Path target = subfolderPath.resolve(uniqueName).normalize();
        try {
            Files.copy(file.getInputStream(), target, StandardCopyOption.REPLACE_EXISTING);
        } catch (IOException e) {
            throw new UncheckedIOException("Failed to store uploaded file", e);
        }

        return "/uploads/" + subfolder + "/" + uniqueName;
    }

    @Override
    public void deleteFile(String fileUrl) {
        if (fileUrl == null || fileUrl.isEmpty()) {
            return;
        }

        try {
            Path filePath = resolveFilePath(fileUrl);
            Files.deleteIfExists(filePath);
        } catch (IOException e) {
            throw new UncheckedIOException("Failed to delete file: " + fileUrl, e);
        }
    }

    private Path resolveFilePath(String fileUrl) {
        // fileUrl is like /uploads/destinations/filename.ext
        // Remove leading slash and "uploads/" prefix
        String relativePath = fileUrl.replaceFirst("^/uploads/", "");
        return baseUploadDir.resolve(relativePath).toAbsolutePath().normalize();
    }

    private String extractExtension(String filename) {
        int idx = filename.lastIndexOf('.');
        if (idx < 0 || idx == filename.length() - 1) {
            return "";
        }
        return filename.substring(idx + 1).toLowerCase();
    }
}
