---
name: universal-software-engineering
description: Universal software engineering standards, SOLID principles, clean architecture, security, performance, and code quality guidelines. Use for all projects regardless of tech stack — Next.js, React, Node.js, Python, Go, Java, .NET, Flutter, and more.
version: 1.0.0
---

# Universal Software Engineering Standards

## Core Objectives

Every design and implementation decision should optimize:
1. **Readability** — code is read hundreds of times, written once
2. **Maintainability** — future maintainers matter
3. **Scalability** — support growth without rewrites
4. **Security** — always verify identity and permissions
5. **Performance** — avoid O(n²) unless justified
6. **Reliability** — handle errors gracefully
7. **Testability** — every function testable in isolation
8. **Reusability** — extract repeated logic
9. **Modularity** — separate concerns clearly
10. **Observability** — log, monitor, track errors

## Fundamental Principles

### SOLID

- **S**ingle Responsibility: one reason to change
- **O**pen/Closed: open for extension, closed for modification
- **L**iskov Substitution: derived types replaceable by base types
- **I**nterface Segregation: clients don't depend on unused methods
- **D**ependency Inversion: depend on abstractions, not implementations

### DRY — Don't Repeat Yourself

Extract to function/component/service when code repeats. One source of truth.

### KISS — Keep It Simple, Stupid

Prefer the simplest solution. Avoid unnecessary abstraction. Simple > Clever.

### YAGNI — You Aren't Gonna Need It

Don't build functionality until required. Current requirements > Future assumptions.

### Separation of Concerns

```
Presentation Layer  →  UI, Components
Application Layer   →  Use Cases, Services
Domain Layer       →  Business Logic, Entities
Infrastructure     →  DB, API, External Services
```

## Architecture Guidelines

```
app/
  components/     # UI layer
  services/       # Application layer
  repositories/   # Data access
  database/       # Infrastructure
  lib/            # Shared utilities
```

## Code Quality Rules

### Naming

Names must clearly communicate intent:

✅ `userProfile`, `orderAmount`, `createdAt`, `calculateDiscount`
❌ `a`, `b`, `temp`, `data1`, `x`

### Function Rules

- **Size**: 10-20 lines recommended, max 30 lines
- **Responsibility**: one thing per function
- **Nesting**: avoid >3 levels; use early return and guard clauses

### File Size

- Recommended: 100-300 lines
- Warning: 500+ lines — refactor when possible

## Security Standards

### Authentication
Always verify identity — JWT, OAuth, Session Auth. Never trust frontend-only auth.

### Authorization
Always verify permissions server-side. Never trust frontend permissions.

### Input Validation
Validate all external input:
- Request body
- Query parameters
- URL parameters
- Uploaded files

### Secrets Management
❌ Never hardcode: API keys, passwords, tokens, DB credentials
✅ Use: `.env`, Secret Manager, vault

### Principle of Least Privilege
Grant only minimum permissions required.

## Performance Standards

### Avoid
- N+1 queries
- Duplicate API calls
- Unnecessary re-renders
- Unoptimized loops

### Prefer
- Caching
- Pagination
- Lazy loading
- Code splitting
- Database indexes

### Complexity
✅ Prefer O(n)
❌ Avoid O(n²), O(n³) unless justified

## Database Rules

- **Normalization**: avoid duplicate data
- **Indexing**: index search fields, foreign keys, sorting fields
- **Transactions**: use for atomic multi-step operations

## API Design

### Naming
✅ `/users`, `/orders`, `/products`
❌ inconsistent pluralization

### HTTP Status Codes
- `200 OK` — success
- `201 Created` — resource created
- `400 Bad Request` — invalid input
- `401 Unauthorized` — not authenticated
- `403 Forbidden` — no permission
- `404 Not Found` — resource missing
- `500 Internal Server Error` — server failure

### Error Format
```json
{
  "success": false,
  "message": "Human readable error",
  "code": "ERROR_CODE"
}
```

## Testability

Every project should support:
- **Unit tests** — individual functions
- **Integration tests** — module interactions
- **E2E tests** — complete user flows

## Observability

### Logging
Log: Info, Warning, Error. Never log sensitive data.

### Monitoring
Monitor: CPU, RAM, database, API performance.

### Error Tracking
Use Sentry, Grafana, or OpenTelemetry.

## Scalability

Design for growth without rewrites. Target:
10 → 100 → 1,000 → 10,000 → 100,000 users

### Decoupling
Avoid tight coupling. Prefer interfaces, dependency injection, service abstractions.

## Clean Code Checklist

Before merging any code:

- [ ] Is it readable?
- [ ] Is it maintainable?
- [ ] Is it secure? (auth, validation, secrets)
- [ ] Is it performant?
- [ ] Is it scalable?
- [ ] Is it testable?
- [ ] Is it reusable?
- [ ] Is it modular?
- [ ] Does it follow SOLID?
- [ ] Does it follow DRY?
- [ ] Does it follow KISS?
- [ ] Does it follow YAGNI?
- [ ] Is error handling present?
- [ ] Are inputs validated?
- [ ] Is sensitive data protected?

## Golden Rule

> Code is written once. Code is read hundreds of times. Optimize for future maintainers before optimizing for yourself.

## Tech Stack Quick Reference

### Next.js / React
- Server Components vs Client Components
- RSC for data, Client for interactivity
- Route handlers for API
- Middleware for auth
- Streaming for performance

### Node.js / Express / NestJS
- Middleware chain
- Dependency injection
- Service layer pattern
- Repository pattern for DB

### Python / Django / FastAPI
- Class-based or function views
- ORM with proper indexing
- Pydantic for validation
- Async for I/O

### Go / Rust
- Interface for abstraction
- Error handling (no exceptions)
- Goroutines / async for concurrency
- Ownership for memory safety

### Java / Spring Boot / .NET
- Dependency injection (IoC container)
- Repository pattern
- Transaction management
- Interface-based design

### Flutter / Mobile
- StatefulWidget / stateless when possible
- BLoC or Riverpod for state
- Repository pattern
- Repository → Data Source → API/DB

## AI Code Generation Rules

When AI generates code, require it to:
1. Follow SOLID principles
2. Follow DRY — no repeated logic
3. Follow KISS — simplest solution
4. Follow YAGNI — no speculative features
5. Follow Clean Architecture
6. Follow Security Best Practices
7. Be fully typed when possible (TypeScript, Python type hints, etc.)
8. Include proper error handling
9. Avoid unnecessary complexity
10. Optimize maintainability first — runtime performance second
