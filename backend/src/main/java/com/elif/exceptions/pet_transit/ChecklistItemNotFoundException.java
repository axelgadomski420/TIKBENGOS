package com.elif.exceptions.pet_transit;

public class ChecklistItemNotFoundException extends RuntimeException {
    public ChecklistItemNotFoundException(String message) {
        super(message);
    }
}
