package com.elif.controllers.ai;

import com.elif.services.ai.PetDescriptionGeneratorService;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/ai/pet-description")
@CrossOrigin(origins = "http://localhost:4200")
public class PetDescriptionController {

    private final PetDescriptionGeneratorService generatorService;

    public PetDescriptionController(PetDescriptionGeneratorService generatorService) {
        this.generatorService = generatorService;
    }

    @PostMapping("/generate")
    public DescriptionResponse generateDescription(@RequestBody DescriptionRequest request) {
        String description = generatorService.generateDescription(
                request.type(),
                request.breed(),
                request.age(),
                request.personality(),
                request.specialNeeds()
        );
        return new DescriptionResponse(description);
    }

    public record DescriptionRequest(
            String type,
            String breed,
            Integer age,
            String personality,
            String specialNeeds
    ) {}

    public record DescriptionResponse(String description) {}
}