package com.vira.common;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.List;

@RestControllerAdvice
public class ApiExceptionHandler {

    @ExceptionHandler(BusinessRuleException.class)
    public ResponseEntity<ApiError> business(BusinessRuleException e) {
        return ResponseEntity.status(e.getStatus())
                .body(new ApiError(e.getCode(), e.getMessage(), List.of()));
    }

    @ExceptionHandler(FieldValidationException.class)
    public ResponseEntity<ApiError> fields(FieldValidationException e) {
        return ResponseEntity.badRequest().body(
                new ApiError("VALIDATION_FAILED", "Please correct the highlighted fields.", e.getErrors()));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiError> beanValidation(MethodArgumentNotValidException e) {
        var errors = e.getBindingResult().getFieldErrors().stream()
                .map(f -> new ApiError.FieldError(f.getField(), f.getDefaultMessage())).toList();
        return ResponseEntity.badRequest().body(
                new ApiError("VALIDATION_FAILED", "Please correct the highlighted fields.", errors));
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<ApiError> malformed(HttpMessageNotReadableException e) {
        return ResponseEntity.badRequest().body(
                new ApiError("MALFORMED_REQUEST", "The request could not be read.", List.of()));
    }

    @ExceptionHandler(NotFoundException.class)
    public ResponseEntity<ApiError> notFound(NotFoundException e) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(new ApiError("NOT_FOUND", e.getMessage(), List.of()));
    }

    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<ApiError> conflict(DataIntegrityViolationException e) {
        return ResponseEntity.status(HttpStatus.CONFLICT).body(
                new ApiError("DATA_CONFLICT", "The change conflicts with existing data.", List.of()));
    }
}