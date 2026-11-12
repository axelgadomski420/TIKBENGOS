package com.elif.services.pet_transit;

import org.springframework.web.multipart.MultipartFile;

public interface FileStorageService {
    String storeDestinationCover(MultipartFile file);
    String storeFile(MultipartFile file, String subfolder);
    void deleteFile(String fileUrl);
}
