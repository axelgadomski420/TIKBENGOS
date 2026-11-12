package com.elif.exceptions.community;

public class NotMemberException extends RuntimeException {
    public NotMemberException(String message) {
        super(message);
    }
}
