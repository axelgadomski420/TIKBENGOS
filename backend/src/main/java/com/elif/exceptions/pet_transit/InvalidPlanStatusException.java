package com.elif.exceptions.pet_transit;

public class InvalidPlanStatusException extends RuntimeException {
    public InvalidPlanStatusException(String message) {
        super(message);
    }
}
