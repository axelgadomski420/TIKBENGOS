package com.elif.exceptions.events;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

/**
 * Business exceptions for the Events module.
 * Each exception carries a semantically correct HTTP status.
 */
public final class EventExceptions {

    private EventExceptions() {}

    // ─── 404 Not Found ──────────────────────────────────────────────────────────
    @ResponseStatus(HttpStatus.NOT_FOUND)
    public static class EventNotFoundException extends RuntimeException {
        public EventNotFoundException(Long id) {
            super("Event not found: " + id);
        }
    }

    @ResponseStatus(HttpStatus.NOT_FOUND)
    public static class CategoryNotFoundException extends RuntimeException {
        public CategoryNotFoundException(Long id) {
            super("Category not found: " + id);
        }
    }

    @ResponseStatus(HttpStatus.NOT_FOUND)
    public static class ParticipantNotFoundException extends RuntimeException {
        public ParticipantNotFoundException(String msg) { super(msg); }
    }

    @ResponseStatus(HttpStatus.NOT_FOUND)
    public static class ReviewNotFoundException extends RuntimeException {
        public ReviewNotFoundException(Long id) {
            super("Review not found: " + id);
        }
    }

    // ─── 409 Conflict ───────────────────────────────────────────────────────────
    @ResponseStatus(HttpStatus.CONFLICT)
    public static class DuplicateRegistrationException extends RuntimeException {
        public DuplicateRegistrationException(Long userId, Long eventId) {
            super("User " + userId + " is already registered for event " + eventId + ".");
        }
    }

    @ResponseStatus(HttpStatus.CONFLICT)
    public static class DuplicateCategoryException extends RuntimeException {
        public DuplicateCategoryException(String name) {
            super("A category with the name '" + name + "' already exists.");
        }
    }

    @ResponseStatus(HttpStatus.CONFLICT)
    public static class DuplicateReviewException extends RuntimeException {
        public DuplicateReviewException() {
            super("You have already left a review for this event.");
        }
    }

    // ─── 422 Unprocessable Entity ───────────────────────────────────────────────
    @ResponseStatus(HttpStatus.UNPROCESSABLE_ENTITY)
    public static class EventNotJoinableException extends RuntimeException {
        public EventNotJoinableException(String status) {
            super("Cannot register: the event is " + status + ".");
        }
    }

    @ResponseStatus(HttpStatus.UNPROCESSABLE_ENTITY)
    public static class InsufficientSlotsException extends RuntimeException {
        public InsufficientSlotsException(int remaining, int requested) {
            super("Only " + remaining + " slot(s) available, you requested " + requested + ".");
        }
    }

    @ResponseStatus(HttpStatus.UNPROCESSABLE_ENTITY)
    public static class EventNotEditableException extends RuntimeException {
        public EventNotEditableException(String status) {
            super("Cannot modify an event that is " + status + ".");
        }
    }

    @ResponseStatus(HttpStatus.UNPROCESSABLE_ENTITY)
    public static class InvalidDateRangeException extends RuntimeException {
        public InvalidDateRangeException(String msg) { super(msg); }
    }

    @ResponseStatus(HttpStatus.UNPROCESSABLE_ENTITY)
    public static class CapacityReductionException extends RuntimeException {
        public CapacityReductionException(int requested, int booked) {
            super("New capacity (" + requested + ") is less than already booked seats (" + booked + ").");
        }
    }

    @ResponseStatus(HttpStatus.UNPROCESSABLE_ENTITY)
    public static class CategoryInUseException extends RuntimeException {
        public CategoryInUseException(Long id) {
            super("Cannot delete category " + id + " because it is used by events.");
        }
    }

    @ResponseStatus(HttpStatus.UNPROCESSABLE_ENTITY)
    public static class RegistrationNotPendingException extends RuntimeException {
        public RegistrationNotPendingException() {
            super("This registration is not pending approval.");
        }
    }

    @ResponseStatus(HttpStatus.UNPROCESSABLE_ENTITY)
    public static class ReviewNotAllowedException extends RuntimeException {
        public ReviewNotAllowedException(String msg) { super(msg); }
    }

    // ─── 403 Forbidden ──────────────────────────────────────────────────────────
    @ResponseStatus(HttpStatus.FORBIDDEN)
    public static class AccessDeniedException extends RuntimeException {
        public AccessDeniedException(String msg) { super(msg); }
    }

    // ─── Waitlist ───────────────────────────────────────────────────────────────
    @ResponseStatus(HttpStatus.CONFLICT)
    public static class AlreadyOnWaitlistException extends RuntimeException {
        public AlreadyOnWaitlistException() {
            super("You are already on the waitlist for this event.");
        }
    }

    @ResponseStatus(HttpStatus.UNPROCESSABLE_ENTITY)
    public static class WaitlistNotOpenException extends RuntimeException {
        public WaitlistNotOpenException() {
            super("The waitlist is not available for this event.");
        }
    }

    // ✅ NEW: Exception for eligibility rule violations
    // Returns HTTP 422 (Unprocessable Entity) because the request
    // contains invalid data according to the competition rules
    @ResponseStatus(HttpStatus.UNPROCESSABLE_ENTITY)
    public static class EligibilityViolationException extends RuntimeException {
        private final int score;

        public EligibilityViolationException(int score, String violations) {
            super("Application not eligible (score " + score + "/100):\n" + violations);
            this.score = score;
        }

        public int getScore() {
            return score;
        }
    }
}