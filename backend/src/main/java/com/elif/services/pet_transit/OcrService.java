package com.elif.services.pet_transit;

import com.elif.dto.pet_transit.response.OcrResultResponse;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;

@Service
@Slf4j
public class OcrService {

    @Value("${ocr.service.url:http://localhost:8000}")
    private String ocrServiceUrl;

    private final RestTemplate restTemplate =
        new RestTemplate();
    private final ObjectMapper objectMapper =
        new ObjectMapper();

    public OcrResultResponse analyzeDocument(
            MultipartFile file,
            String documentType) {

        try {
            String url = ocrServiceUrl + "/ocr/analyze";

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(
                MediaType.MULTIPART_FORM_DATA);

            MultiValueMap<String, Object> body =
                new LinkedMultiValueMap<>();

            ByteArrayResource resource =
                new ByteArrayResource(file.getBytes()) {
                    @Override
                    public String getFilename() {
                        return file.getOriginalFilename()
                            != null
                            ? file.getOriginalFilename()
                            : "document";
                    }
                };

            body.add("file", resource);
            body.add("documentType",
                documentType != null
                ? documentType : "UNKNOWN");

            HttpEntity<MultiValueMap<String, Object>>
                request = new HttpEntity<>(body, headers);

            ResponseEntity<Map> response =
                restTemplate.postForEntity(
                    url, request, Map.class);

            if (response.getStatusCode().is2xxSuccessful()
                    && response.getBody() != null) {

                Map<String, Object> responseBody =
                    response.getBody();

                Boolean success =
                    (Boolean) responseBody.get("success");

                if (Boolean.TRUE.equals(success)) {
                    Object data = responseBody.get("data");
                    String json = objectMapper
                        .writeValueAsString(data);
                    return objectMapper.readValue(
                        json, OcrResultResponse.class);
                }
            }

        } catch (Exception e) {
            log.error("OCR service call failed: {}",
                e.getMessage());
        }

        // Return safe empty result if OCR unavailable
        return OcrResultResponse.builder()
            .confidence(0.0)
            .source("unavailable")
            .missingFields(List.of())
            .warnings(List.of(
                "OCR service unavailable. "
                + "Please fill fields manually."))
            .build();
    }
}
