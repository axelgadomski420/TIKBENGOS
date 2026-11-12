package com.elif.exceptions.pet_transit;

public class TravelPlanNotFoundException extends RuntimeException {
    public TravelPlanNotFoundException(String message) {
        super(message);
    }
}
