package com.elif.exceptions.pet_profile;

public class PetProfileNotFoundException extends RuntimeException {
    public PetProfileNotFoundException(Long petId) {
        super("Pet profile not found with id: " + petId);
    }
}
