package com.vira.common;

import java.util.ArrayList;
import java.util.List;

public final class FieldErrors {
    private final List<ApiError.FieldError> list = new ArrayList<>();

    public FieldErrors add(String field, String message) {
        list.add(new ApiError.FieldError(field, message));
        return this;
    }

    public FieldErrors addIfNotNull(String field, String message) {
        return message == null ? this : add(field, message);
    }

    public void throwIfAny() {
        if (!list.isEmpty()) throw new FieldValidationException(list);
    }
}