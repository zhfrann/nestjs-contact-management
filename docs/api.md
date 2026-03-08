# Table of Contents

- [API Documentation](#api-documentation)
  - [Base URL](#base-url)
  - [Response Format](#response-format)
  - [Error Format](#error-format)
  - [Available Endpoints](#available-endpoints)

## API Documentation

### Base URL

All API endpoints are prefixed with version:

```
http://localhost:3000/v1
```

### Response Format

All successful responses follow a consistent envelope structure:

```json
{
  "message": "Success message (localized)",
  "data": {
    // Response payload
  },
  "meta": {
    "requestId": "unique-request-id",
    "timestamp": "2024-01-15T10:30:00.000Z"
    // Additional metadata (pagination, etc.)
  }
}
```

**Example - Health Check Response:**

```json
{
  "message": "Health check success",
  "data": {
    "status": "ok"
  },
  "meta": {
    "requestId": "abc123xyz789",
    "timestamp": "2024-01-15T10:30:00.000Z"
  }
}
```

### Error Format

All error responses follow a consistent structure:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Error message (localized)",
    "details": []  // Optional: validation errors
  },
  "meta": {
    "requestId": "unique-request-id",
    "timestamp": "2024-01-15T10:30:00.000Z"
  }
}
```

**Example - Validation Error:**

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": [
      {
        "field": "email",
        "issues": ["email must be a valid email address"]
      },
      {
        "field": "password",
        "issues": ["password must be at least 8 characters"]
      }
    ]
  },
  "meta": {
    "requestId": "abc123xyz789",
    "timestamp": "2024-01-15T10:30:00.000Z"
  }
}
```

**Example - Not Found Error:**

```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "Resource not found"
  },
  "meta": {
    "requestId": "abc123xyz789",
    "timestamp": "2024-01-15T10:30:00.000Z"
  }
}
```

**Example - Rate Limit Error:**

```json
{
  "error": {
    "code": "TOO_MANY_REQUESTS",
    "message": "Too many requests"
  },
  "meta": {
    "requestId": "abc123xyz789",
    "timestamp": "2024-01-15T10:30:00.000Z"
  }
}
```

### Available Endpoints

| Method | Endpoint | Description | Rate Limited |
|--------|----------|-------------|--------------|
| GET | `/v1/health` | Health check | No |
