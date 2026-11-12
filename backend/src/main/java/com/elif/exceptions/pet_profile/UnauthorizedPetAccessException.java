package com.elif.exceptions.pet_profile;

public class UnauthorizedPetAccessException extends RuntimeException {
    public UnauthorizedPetAccessException(String message) {
        super(message);
    }
}
