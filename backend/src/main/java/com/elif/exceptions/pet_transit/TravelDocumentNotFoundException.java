package com.elif.exceptions.pet_transit;

public class TravelDocumentNotFoundException extends RuntimeException {
    public TravelDocumentNotFoundException(String message) {
        super(message);
    }
}
