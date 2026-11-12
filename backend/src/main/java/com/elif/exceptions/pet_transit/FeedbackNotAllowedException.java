package com.elif.exceptions.pet_transit;

public class FeedbackNotAllowedException extends RuntimeException {
    public FeedbackNotAllowedException(String message) {
        super(message);
    }
}