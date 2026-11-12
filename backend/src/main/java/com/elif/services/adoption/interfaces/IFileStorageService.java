package com.elif.services.adoption.interfaces;

import org.springframework.web.multipart.MultipartFile;

public interface IFileStorageService {
    String storeFile(MultipartFile file, String subFolder);
}