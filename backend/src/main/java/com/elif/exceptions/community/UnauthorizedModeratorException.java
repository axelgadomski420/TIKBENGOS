package com.elif.exceptions.community;

public class UnauthorizedModeratorException extends RuntimeException {
    public UnauthorizedModeratorException(String message) {
        super(message);
    }
}
