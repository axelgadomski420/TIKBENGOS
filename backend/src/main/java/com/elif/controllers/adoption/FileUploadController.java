package com.elif.controllers.adoption;

import com.elif.services.adoption.interfaces.IFileStorageService;  // ← Modifier l'import
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/adoption/upload")
@CrossOrigin(origins = "http://localhost:4200")
@RequiredArgsConstructor
public class FileUploadController {

    private final IFileStorageService fileStorageService;  // ← Utiliser l'interface

    @PostMapping("/pet")
    public ResponseEntity<Map<String, String>> uploadPetImage(@RequestParam("file") MultipartFile file) {
        String fileUrl = fileStorageService.storeFile(file, "pets");
        Map<String, String> response = new HashMap<>();
        response.put("url", fileUrl);
        return ResponseEntity.ok(response);
    }
}