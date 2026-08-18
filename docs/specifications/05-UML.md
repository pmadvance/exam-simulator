# UML Diagrams

**Project:** PM Certification Practice Exam Simulator Platform  
**Version:** 1.0  
**Date:** 17 April 2026

---

## 1. Component Diagram — System Architecture

```mermaid
graph TB
    subgraph Client["Client Browser"]
        WEB["Next.js 15 Web App<br/>(React 19 + Bootstrap 5)"]
    end

    subgraph Server["Server"]
        API["Express.js API<br/>(Node.js)"]
        REDIS["Redis 7<br/>(Cache + Rate Limit)"]
        MYSQL["MySQL 8<br/>(Primary DB)"]
    end

    subgraph External["External Services"]
        TOYYIBPAY["ToyyibPay<br/>(Payment Gateway)"]
        SMTP["SMTP<br/>(Email Service)"]
    end

    WEB -->|"HTTPS REST API<br/>Cookie Auth"| API
    API -->|"SQL Queries"| MYSQL
    API -->|"Cache / Rate Limit"| REDIS
    API -->|"Create Bill / Verify"| TOYYIBPAY
    API -->|"Send Reset Email"| SMTP
    TOYYIBPAY -->|"Payment Callback<br/>(POST form-encoded)"| API
    WEB -->|"Redirect for Payment"| TOYYIBPAY
```

---

## 2. Component Diagram — API Module Structure

```mermaid
graph LR
    subgraph API["Express API"]
        MW["Middleware Layer"]
        MW --> AUTH_MW["Auth Middleware<br/>(JWT verify)"]
        MW --> ROLE_MW["Role Guard<br/>(admin check)"]
        MW --> RATE["Rate Limiter<br/>(Redis)"]
        MW --> CORS["CORS"]
        MW --> ERR["Error Handler"]
        
        subgraph Routes["Route Modules (14)"]
            R1["auth.ts"]
            R2["products.ts"]
            R3["exams.ts"]
            R4["questions.ts"]
            R5["attempts.ts"]
            R6["enrollments.ts"]
            R7["orders.ts"]
            R8["checkout.ts"]
            R9["users.ts"]
            R10["sessions.ts"]
            R11["vouchers.ts"]
            R12["categories.ts"]
            R13["reports.ts"]
            R14["audit-logs.ts"]
        end

        subgraph Libs["Libraries"]
            L1["db.ts (MySQL pool)"]
            L2["redis.ts"]
            L3["payment/<br/>types + toyyibpay + index"]
            L4["email.ts"]
        end
    end
```

---

## 3. Class Diagram — Domain Models

```mermaid
classDiagram
    class User {
        +BigInt id
        +String email
        +String full_name
        +String password_hash
        +Enum role
        +Enum status
        +DateTime created_at
        +DateTime updated_at
    }

    class Product {
        +BigInt id
        +String slug
        +String title
        +String description
        +String category
        +String difficulty
        +Decimal price_myr
        +Int access_days
        +Enum visibility
        +DateTime created_at
    }

    class Exam {
        +BigInt id
        +BigInt product_id
        +String slug
        +String title
        +Int time_limit_minutes
        +Int pass_threshold
        +Enum status
    }

    class Question {
        +BigInt id
        +BigInt exam_id
        +String prompt
        +String option_a
        +String option_b
        +String option_c
        +String option_d
        +Char correct_answer
        +String explanation
    }

    class Order {
        +BigInt id
        +BigInt user_id
        +BigInt product_id
        +Enum status
        +Decimal total_amount
        +String gateway_provider
        +String gateway_bill_code
        +String gateway_reference
    }

    class PaymentEvent {
        +BigInt id
        +String event_key
        +BigInt order_id
        +String provider
        +String event_type
        +JSON payload
    }

    class Enrollment {
        +BigInt id
        +BigInt user_id
        +BigInt product_id
        +DateTime starts_at
        +DateTime expires_at
        +Enum status
    }

    class Attempt {
        +UUID id
        +BigInt user_id
        +BigInt exam_id
        +Enum status
        +Boolean training_mode
        +JSON answers_json
        +JSON marked_for_review_json
        +Int score
        +Int total_questions
        +DateTime started_at
        +DateTime submitted_at
    }

    class AuthSession {
        +UUID id
        +BigInt user_id
        +String refresh_token_hash
        +String user_agent
        +String ip_address
        +DateTime expires_at
        +DateTime revoked_at
    }

    class Voucher {
        +BigInt id
        +String code
        +Enum type
        +Decimal amount
        +Decimal min_order
        +Int usage_limit
        +Int per_user_limit
        +BigInt product_id
        +DateTime valid_from
        +DateTime valid_until
        +Enum status
    }

    class VoucherRedemption {
        +BigInt id
        +BigInt voucher_id
        +BigInt user_id
        +BigInt order_id
        +Decimal discount_amount
    }

    User "1" --> "*" Order : places
    User "1" --> "*" Enrollment : has
    User "1" --> "*" Attempt : takes
    User "1" --> "*" AuthSession : owns
    Product "1" --> "*" Exam : contains
    Product "1" --> "*" Order : purchased_via
    Product "1" --> "*" Enrollment : grants
    Exam "1" --> "*" Question : has
    Exam "1" --> "*" Attempt : attempted_in
    Order "1" --> "*" PaymentEvent : receives
    Order "1" --> "*" VoucherRedemption : discounted_by
    Voucher "1" --> "*" VoucherRedemption : redeemed_as
```

---

## 4. Sequence Diagram — Guest Purchase Flow

```mermaid
sequenceDiagram
    actor Guest
    participant Web as Next.js Frontend
    participant API as Express API
    participant DB as MySQL
    participant Pay as ToyyibPay

    Guest->>Web: Fill checkout form (name, email, password)
    Guest->>Web: Click "Pay RM X"
    Web->>API: POST /api/checkout/register-and-pay
    
    API->>DB: Check email uniqueness
    DB-->>API: Not found
    API->>DB: INSERT users (student)
    DB-->>API: user_id = 42
    API->>DB: INSERT orders (pending)
    DB-->>API: order_id = 100
    
    API->>Pay: POST /api/createBill
    Pay-->>API: { billCode: "abc123", billUrl: "..." }
    
    API->>DB: UPDATE orders SET gateway_bill_code
    API-->>Web: { paymentUrl, orderId, billCode }
    
    Web->>Guest: Redirect to ToyyibPay
    Guest->>Pay: Complete payment
    
    Pay->>API: POST /api/payments/callbacks/toyyibpay
    API->>DB: INSERT payment_events (idempotent)
    API->>DB: UPDATE orders SET status='paid'
    API->>DB: INSERT enrollments
    API-->>Pay: 200 OK
    
    Pay->>Guest: Redirect back to result page
    Guest->>Web: Load checkout result page
    Web->>API: GET /api/checkout/orders/100/status (poll)
    API->>DB: SELECT order status
    DB-->>API: status = 'paid'
    API-->>Web: { status: 'paid', enrollmentId: 15 }
    Web->>Guest: Show success + "Go to Dashboard"
```

---

## 5. Sequence Diagram — Timed Exam Attempt

```mermaid
sequenceDiagram
    actor Student
    participant Web as Next.js Frontend
    participant API as Express API
    participant DB as MySQL

    Student->>Web: Click "Start Timed Exam"
    Web->>API: POST /api/exams/:examId/attempts
    API->>DB: Verify enrollment active
    API->>DB: INSERT attempts (in_progress)
    API->>DB: SELECT questions for exam
    DB-->>API: Questions (no answers)
    API-->>Web: { attemptId, questions, timeLimit }

    Web->>Student: Show Question 1 + Start Timer

    loop For Each Question
        Student->>Web: Select answer (A/B/C/D)
        Note over Web: Debounce 500ms
        Web->>API: PATCH /api/attempts/:id/answers
        API->>DB: UPDATE answers_json
        API-->>Web: 200 OK
    end

    alt Timer Expired
        Web->>Web: Auto-trigger submit
    else Student clicks Submit
        Student->>Web: Click Submit
    end

    Web->>API: POST /api/attempts/:id/submit
    API->>DB: Load attempt + questions
    API->>API: Calculate score
    API->>DB: UPDATE attempt (submitted, score)
    API-->>Web: { score, total, percentage, passed, review }
    Web->>Student: Show Results Page
```

---

## 6. Sequence Diagram — JWT Auth & Token Refresh

```mermaid
sequenceDiagram
    actor User
    participant Web as Frontend
    participant API as Express API
    participant Redis
    participant DB as MySQL

    User->>Web: Login (email + password)
    Web->>API: POST /api/auth/login
    API->>Redis: Check rate limit
    Redis-->>API: OK (under limit)
    API->>DB: SELECT user by email
    API->>API: Verify bcrypt password
    API->>DB: INSERT auth_sessions
    API-->>Web: Set cookies (access + refresh)
    Web->>User: Redirect to dashboard

    Note over Web,API: Later... access token expired

    Web->>API: GET /api/dashboard (401 - expired)
    API-->>Web: 401 Unauthorized
    Web->>API: POST /api/auth/refresh (refresh cookie)
    API->>DB: Verify refresh_token_hash
    API->>API: Generate new tokens (rotation)
    API->>DB: UPDATE auth_sessions
    API-->>Web: Set new cookies
    Web->>API: Retry GET /api/dashboard
    API-->>Web: 200 dashboard data
```

---

## 7. Sequence Diagram — Admin CSV Question Import

```mermaid
sequenceDiagram
    actor Admin
    participant Web as Admin UI
    participant API as Express API
    participant DB as MySQL

    Admin->>Web: Upload CSV file
    Web->>API: POST /api/exams/:examId/questions/import
    API->>API: Parse CSV rows
    API->>API: Validate each row (Zod)
    
    alt Validation Errors
        API-->>Web: 400 { errors: [...] }
        Web->>Admin: Show validation errors
    else Valid
        API->>DB: INSERT question_import_batches
        API->>DB: INSERT question_versions (for each row)
        API->>DB: UPSERT questions (apply batch)
        API-->>Web: 200 { imported: 50, batch_id: "..." }
        Web->>Admin: Show success + diff summary
    end
```

---

## 8. State Diagram — Order Lifecycle

```mermaid
stateDiagram-v2
    [*] --> pending : Order created
    pending --> paid : Payment callback (success)
    pending --> failed : Payment callback (failed)
    pending --> paid : Manual reconciliation (admin)
    paid --> refunded : Admin refund (future)
    failed --> pending : Retry payment (future)
    paid --> [*]
    refunded --> [*]
    failed --> [*]
```

---

## 9. State Diagram — Enrollment Lifecycle

```mermaid
stateDiagram-v2
    [*] --> active : Payment confirmed
    active --> expired : expires_at passed
    active --> revoked : Admin revocation
    active --> active : Admin extends expiry
    expired --> active : Renewal purchase
    revoked --> [*]
    expired --> [*]
```

---

## 10. State Diagram — Attempt Lifecycle

```mermaid
stateDiagram-v2
    [*] --> in_progress : Student starts exam
    in_progress --> in_progress : Save answers (auto-save)
    in_progress --> submitted : Student submits
    in_progress --> submitted : Timer auto-submit
    submitted --> [*]
```
