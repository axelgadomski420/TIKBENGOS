package com.elif.services.marketplace;

import com.elif.dto.marketplace.ReclamationDTO;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

public interface IMarketplaceReclamationService {
    ReclamationDTO createReclamation(ReclamationDTO request, MultipartFile image);

    ReclamationDTO updateReclamation(Long id, ReclamationDTO request, MultipartFile image);

    ReclamationDTO getById(Long id);

    List<ReclamationDTO> getByUserId(Long userId);

    List<ReclamationDTO> getAll();

    ReclamationDTO updateStatus(Long id, String status, String responseMalek);
}
