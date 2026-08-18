# User Flow Diagrams

**Project:** PM Certification Practice Exam Simulator Platform  
**Version:** 1.0  
**Date:** 17 April 2026

---

## 1. Guest Purchase & Registration Flow

```mermaid
flowchart TD
    A[Guest visits Landing Page] --> B[Browse Product Catalog]
    B --> C[Select Exam Pack]
    C --> D[Product Detail Page]
    D --> E{User logged in?}
    
    E -->|No| F[Checkout Page - Registration Form]
    F --> G[Enter Name, Email, Password]
    G --> H[Optional: Apply Voucher Code]
    H --> I[Click 'Pay RM X']
    I --> J[API: POST /checkout/register-and-pay]
    J --> K[Create user account]
    K --> L[Create pending order]
    L --> M[Apply voucher discount if any]
    M --> N{Total > 0?}
    N -->|Yes| O[Create ToyyibPay Bill]
    O --> P[Redirect to ToyyibPay Payment Page]
    P --> Q{Payment Result}
    Q -->|Success| R[Callback: POST /payments/callbacks/toyyibpay]
    R --> S[Update order status = paid]
    S --> T[Create enrollment with expiry]
    T --> U[Redirect to Checkout Result Page ✅]
    Q -->|Failed| V[Redirect to Checkout Result Page ❌]
    N -->|No - Free via voucher| W[Auto-complete order]
    W --> T
    
    E -->|Yes| X[Checkout Page - Simplified]
    X --> H
```

---

## 2. Returning User Login & Dashboard Flow

```mermaid
flowchart TD
    A[User visits Login Page] --> B[Enter Email & Password]
    B --> C[API: POST /auth/login]
    C --> D{Credentials valid?}
    
    D -->|No| E[Show error message]
    E --> B
    
    D -->|Yes| F{Account suspended?}
    F -->|Yes| G[Show suspended message]
    F -->|No| H[Create auth session]
    H --> I[Set access + refresh token cookies]
    I --> J[Redirect to Dashboard]
    
    J --> K[My Exams - Active Enrollments]
    K --> L{Select Exam}
    L --> M[Exam Lobby Page]
    
    J --> N[Purchase History]
    J --> O[Profile Settings]
```

---

## 3. Exam Attempt Flow (Study Mode)

```mermaid
flowchart TD
    A[Dashboard - My Exams] --> B[Select Enrolled Exam]
    B --> C[Exam Lobby Page]
    C --> D{Enrollment active?}
    
    D -->|No - Expired| E[Show expiry notice + Renew option]
    D -->|Yes| F[Choose Mode]
    
    F --> G[Study / Training Mode]
    G --> H[API: POST /exams/:id/attempts - training_mode=1]
    H --> I[Load questions]
    I --> J[Display Question with Navigation]
    
    J --> K[Answer Question A/B/C/D]
    K --> L[Show instant feedback ✅❌ + Explanation]
    L --> M[Mark for Review toggle]
    M --> N{More questions?}
    N -->|Yes| J
    N -->|No| O[Summary Page]
    O --> P[Submit Attempt]
    P --> Q[API: POST /attempts/:id/submit]
    Q --> R[Calculate Score]
    R --> S[Results Page with Breakdown]
```

---

## 4. Exam Attempt Flow (Timed Exam Mode)

```mermaid
flowchart TD
    A[Exam Lobby] --> B[Start Timed Exam]
    B --> C[API: POST /exams/:id/attempts - training_mode=0]
    C --> D[Start countdown timer]
    D --> E[Display Question]
    
    E --> F[Answer Question A/B/C/D]
    F --> G[No instant feedback shown]
    G --> H[Mark for Review toggle]
    H --> I{Navigate}
    I -->|Next| E
    I -->|Previous| E
    I -->|Jump to #| E
    I -->|Submit| J
    
    D --> K{Timer expired?}
    K -->|Yes| J[Auto-submit]
    
    J --> L[API: POST /attempts/:id/submit]
    L --> M[Calculate Score]
    M --> N[Results Page]
    N --> O[Score / Total]
    N --> P[Pass/Fail indicator]
    N --> Q[Per-question review with explanations]
    N --> R[Highlighted incorrect answers]
```

---

## 5. Admin Content Management Flow

```mermaid
flowchart TD
    A[Admin Login] --> B[Admin Dashboard]
    
    B --> C[Products Management]
    C --> C1[Create Product]
    C --> C2[Edit Product]
    C --> C3[Set Visibility - draft/published/archived]
    
    B --> D[Exams Management]
    D --> D1[Create Exam under Product]
    D --> D2[Edit Exam Settings]
    D --> D3[Manage Questions]
    D3 --> D3a[Add Question Manually]
    D3 --> D3b[CSV Bulk Import]
    D3b --> D3c[Upload CSV file]
    D3c --> D3d[API validates and stages batch]
    D3d --> D3e{Validation OK?}
    D3e -->|Yes| D3f[Apply batch - create questions]
    D3e -->|No| D3g[Show validation errors]
    D3 --> D3h[Export Questions as CSV]
    
    B --> E[Users Management]
    E --> E1[View Users List with pagination]
    E --> E2[Toggle user status - active/suspended]
    E --> E3[View user enrollments & attempts]
    
    B --> F[Orders Management]
    F --> F1[View Orders with filters]
    F --> F2[View Payment Events]
    
    B --> G[Vouchers Management]
    G --> G1[Create Voucher - fixed/percentage]
    G --> G2[Set usage limits & validity dates]
    G --> G3[View Redemption History]
    
    B --> H[App Settings]
    H --> H1[Update key-value configuration]
    
    B --> I[Audit Logs]
    I --> I1[View immutable action history]
    I --> I2[Filter by actor, action, entity]
```

---

## 6. Password Reset Flow

```mermaid
flowchart TD
    A[Login Page] --> B[Click 'Forgot Password']
    B --> C[Enter Email Address]
    C --> D[API: POST /auth/forgot-password]
    D --> E{Email exists?}
    
    E -->|Yes| F[Generate secure token]
    F --> G[Store hashed token with 1hr expiry]
    G --> H[Send reset link via email]
    
    E -->|No| I[Show generic success message]
    
    H --> J[User clicks link in email]
    J --> K[Reset Password Page with token]
    K --> L[Enter new password twice]
    L --> M[API: POST /auth/reset-password]
    M --> N{Token valid & not expired?}
    
    N -->|Yes| O[Update password hash]
    O --> P[Revoke all existing sessions]
    P --> Q[Mark token as consumed]
    Q --> R[Redirect to login with success message]
    
    N -->|No| S[Show invalid/expired token error]
```

---

## 7. JWT Token Refresh Flow

```mermaid
flowchart TD
    A[API Request with Access Token] --> B{Access token valid?}
    
    B -->|Yes| C[Process request normally]
    
    B -->|No - Expired| D[Client: POST /auth/refresh]
    D --> E[Send refresh token cookie]
    E --> F{Refresh token valid?}
    
    F -->|No - Invalid/Expired| G[Clear cookies]
    G --> H[Redirect to login]
    
    F -->|Yes| I[Verify SHA-256 hash match]
    I --> J[Check session not revoked]
    J --> K{Session OK?}
    
    K -->|No| G
    K -->|Yes| L[Rotate refresh token]
    L --> M[Issue new access + refresh tokens]
    M --> N[Update session in DB]
    N --> O[Set new cookies]
    O --> P[Retry original request]
```

---

## 8. Checkout with Voucher Flow

```mermaid
flowchart TD
    A[Checkout Page] --> B[Enter Voucher Code]
    B --> C[Click 'Apply']
    C --> D[API: POST /checkout/vouchers/apply]
    D --> E{Voucher valid?}
    
    E -->|No| F[Show error: invalid/expired/used]
    
    E -->|Yes| G{Check constraints}
    G --> G1{Min order met?}
    G1 -->|No| F
    G1 -->|Yes| G2{Usage limit OK?}
    G2 -->|No| F
    G2 -->|Yes| G3{Per-user limit OK?}
    G3 -->|No| F
    G3 -->|Yes| G4{Product restriction OK?}
    G4 -->|No| F
    G4 -->|Yes| H[Calculate discount]
    
    H --> I{Voucher type}
    I -->|Fixed| J[Discount = voucher.amount]
    I -->|Percentage| K[Discount = price × voucher.amount / 100]
    
    J --> L[Update order summary display]
    K --> L
    L --> M[Show: Original Price, Discount, Final Amount]
    M --> N{Final amount > 0?}
    N -->|Yes| O[Proceed to payment gateway]
    N -->|No| P[Free order - skip payment]
```

---

## 9. Payment Verification Flow (Localhost Callback Fallback)

```mermaid
flowchart TD
    A[User returns from ToyyibPay] --> B[Checkout Result Page]
    B --> C[API: GET /checkout/orders/:id/status]
    C --> D{Order status?}
    
    D -->|paid| E[Show success ✅ with enrollment info]
    D -->|failed| F[Show failure ❌]
    D -->|pending| G[API: POST /checkout/orders/:id/verify]
    
    G --> H[Server calls ToyyibPay getBillTransactions API]
    H --> I{Transaction found?}
    
    I -->|Yes - status 1| J[Update order to paid]
    J --> K[Create enrollment]
    K --> L[Return status: paid]
    L --> E
    
    I -->|Yes - status 3| M[Update order to failed]
    M --> N[Return status: failed]
    N --> F
    
    I -->|No or pending| O[Return status: pending]
    O --> P[Continue polling every 3s up to 20 attempts]
    P --> C
```

---

## 10. Exam Auto-Resume Flow

```mermaid
flowchart TD
    A[Student opens exam page /exams/:slug] --> B[API: GET /exams/:slug/in-progress]
    B --> C{In-progress attempt exists?}
    
    C -->|Yes| D[Load attempt into simulator state]
    D --> E[Restore saved answers from answers_json]
    E --> F[Restore marked_for_review flags]
    F --> G[Calculate remaining time from started_at + time_limit]
    G --> H[Resume exam at question 1]
    
    C -->|No| I[Show exam lobby]
    I --> J{Choose mode}
    J -->|Timed Exam| K[API: POST /exams/:slug/attempts - training_mode=0]
    J -->|Training Mode| L[API: POST /exams/:slug/attempts - training_mode=1]
    K --> M[Start fresh attempt]
    L --> M
```

---

## 11. Landing Page Enrollment Display Flow

```mermaid
flowchart TD
    A[User visits Landing Page] --> B{User logged in?}
    
    B -->|No| C[Show all products with 'Buy access' button]
    C --> D[Click 'Buy access']
    D --> E[Navigate to /checkout?product=slug]
    
    B -->|Yes| F[API: GET /enrollments - fetch active enrollments]
    F --> G[Match enrollments to products by productSlug]
    
    G --> H{Product purchased?}
    H -->|Yes - active enrollment| I[Show 'Access — X days left' badge]
    I --> J[Link to /me/exams]
    
    H -->|No - not purchased| K[Show 'Buy access' button with price]
    K --> D
```
