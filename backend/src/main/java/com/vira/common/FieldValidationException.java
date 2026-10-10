package com.vira.common;

import java.util.List;

public class FieldValidationException extends RuntimeException {
    private final List<ApiError.FieldError> errors;

    public FieldValidationException(List<ApiError.FieldError> errors) {
        super("Validation failed");
        this.errors = errors;
    }

    public FieldValidationException(String field, String message) {
        this(List.of(new ApiError.FieldError(field, message)));
    }

    public List<ApiError.FieldError> getErrors() { return errors; }
}