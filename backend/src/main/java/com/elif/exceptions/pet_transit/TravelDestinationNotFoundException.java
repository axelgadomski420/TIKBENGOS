package com.elif.exceptions.pet_transit;

public class TravelDestinationNotFoundException extends RuntimeException {
    public TravelDestinationNotFoundException(String message) {
        super(message);
    }
}
