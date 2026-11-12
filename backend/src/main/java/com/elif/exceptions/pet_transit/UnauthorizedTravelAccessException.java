package com.elif.exceptions.pet_transit;

public class UnauthorizedTravelAccessException extends RuntimeException {
    public UnauthorizedTravelAccessException(String message) {
        super(message);
    }
}
