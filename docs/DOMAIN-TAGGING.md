# Domain Tagging System

How question domain tagging works and how it powers the Performance Analytics page.

---

## Overview

Every question in the `questions` table has two optional classification columns:

| Column                | DB Column            | Type           | Maps To                          |
|-----------------------|----------------------|----------------|----------------------------------|
| **ECO Domain**        | `eco_domain`         | VARCHAR(120)   | **ECO Domain** (Examination Content Outline) |
| **Performance Domain** | `performance_domain` | VARCHAR(120)   | **Performance Domain** (Knowledge/Process Area) |

These two columns drive the **Performance Analytics** page that students see at `/me/performance`.

### Domain Management Tables

Domains are managed per-product via two admin tables:

| Table                  | Purpose                                      |
|------------------------|----------------------------------------------|
| `eco_domains`          | ECO Domain master list, scoped by product_id |
| `performance_domains`  | Performance Domain master list, scoped by product_id |

Different products (PMP, CAPM, etc.) can have entirely different domain sets.

---

## How It Works End-to-End

```
Admin defines domains per product (ECO Domains tab, Performance Domains tab)
        ↓
Admin sets eco_domain + performance_domain on question
        ↓
Student takes exam, answers are saved in attempts.answers_json
        ↓
GET /api/performance aggregates correct/incorrect per eco_domain & performance_domain
        ↓
Performance Analytics page renders domain breakdown charts
```

### 1. Admin Manages Domains

In the **Admin Dashboard**:

- **ECO Domains tab**: CRUD for ECO domains per product (e.g., People, Process, Business Environment for PMP).
- **Performance Domains tab**: CRUD for Performance domains per product (e.g., Team, Planning, Delivery for PMP).

Each domain entry has a `product_id`, `name`, and optional `description`.

### 2. Admin Creates/Edits Questions

In the **Admin Dashboard → Questions** tab:

- **ECO Domain** field: Free-text input. Enter the ECO Domain (e.g., `People`, `Process`, `Business Environment`).
- **Performance Domain** field: Free-text input. Enter the Performance Domain (e.g., `Team`, `Predictive Methodologies`).

Both fields are optional. If left empty, they default to `Uncategorized` in the analytics API.

Questions can also be imported via **CSV Upload**. The CSV format includes `ecoDomain` and `performanceDomain` as optional columns:

```
prompt,optionA,optionB,optionC,optionD,correctAnswer,explanation,ecoDomain,performanceDomain,imageUrl
"What is...","A","B","C","D","B","Because...","Process","Team",""
```

**Note:** CSV import also accepts legacy column names `tag` and `category` for backward compatibility.

### 3. Database Storage

```sql
-- questions table (relevant columns)
eco_domain          VARCHAR(120) DEFAULT NULL,   -- ECO Domain
performance_domain  VARCHAR(120) DEFAULT NULL,   -- Performance Domain

-- Domain management tables
eco_domains (id, product_id, name, description, ...)
performance_domains (id, product_id, name, description, ...)
```

### 4. API Aggregation (GET /api/performance)

Located in `apps/api/src/routes/student.ts`. For each submitted attempt:

1. Loads all questions for exams the student attempted
2. Builds a lookup map: `questionId → { correctAnswer, ecoDomain, performanceDomain }`
3. Cross-references each answer in `answers_json` against the correct answer
4. Aggregates totals by `ecoDomain` (ECO) and `performanceDomain` (Performance Domain)
5. Returns `{ attempts, ecoDomains, performanceDomains }` — each domain entry contains:
   - `domain`: The ecoDomain/performanceDomain name
   - `totalQuestions`: Number of questions answered in this domain
   - `correctAnswers`: Number answered correctly
   - `averageScore`: Percentage correct (0–100)

### 5. Admin Domain Management APIs

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET    | `/api/admin/eco-domains?productId=X` | List ECO domains (optionally by product) |
| POST   | `/api/admin/eco-domains` | Create ECO domain `{ productId, name, description }` |
| PATCH  | `/api/admin/eco-domains/:id` | Update ECO domain `{ name, description }` |
| DELETE | `/api/admin/eco-domains/:id` | Delete ECO domain |
| GET    | `/api/admin/performance-domains?productId=X` | List Performance domains |
| POST   | `/api/admin/performance-domains` | Create Performance domain |
| PATCH  | `/api/admin/performance-domains/:id` | Update Performance domain |
| DELETE | `/api/admin/performance-domains/:id` | Delete Performance domain |

### 6. Student Performance Analytics

The Performance page (`/me/performance`) has 5 tabs:

| Tab | What It Shows |
|-----|---------------|
| **Overall** | Score trend line chart across all attempts |
| **Past Results** | Table of all submitted attempts with pass/fail status |
| **Project Performance Domain** | Breakdown by `performance_domain` — table with progress bars per domain |
| **ECO Domain** | Breakdown by `eco_domain` — table with progress bars per domain |
| **Trends** | Strongest/weakest areas, bar chart comparison, moving average |

---

## Current Domain Values

### PMP (product_id = 13)

**ECO Domains (eco_domain):**
| Name | Description |
|------|-------------|
| People | Managing team, leadership, conflict resolution, stakeholder engagement |
| Process | Planning, executing, monitoring work, managing scope/schedule/cost |
| Business Environment | Benefits realization, compliance, organizational change, strategic alignment |

**Performance Domains (performance_domain):**
| Name | Description |
|------|-------------|
| Team | Building and managing the project team |
| Planning | Establishing project plans and baselines |
| Delivery | Delivering project value and managing quality |
| Project Work | Executing and managing project activities |
| Stakeholders | Engaging and managing stakeholder expectations |
| Measurement | Tracking and evaluating project performance |
| Uncertainty | Managing risks and ambiguity |
| Development Approach | Selecting and tailoring delivery approaches |

### CAPM (product_id = 14)

**ECO Domains (eco_domain):**
| Name | Description |
|------|-------------|
| People | Team leadership, roles, servant leadership, RACI |
| Process | Process groups, scheduling, scope, quality, risk management |
| Business Environment | Business cases, feasibility, organizational strategy, PEST analysis |

**Performance Domains (performance_domain):**
| Name | Description |
|------|-------------|
| Project Management Fundamentals | Core PM concepts — project definition, progressive elaboration, lessons learned |
| Predictive Methodologies | Waterfall/plan-driven — WBS, critical path, process groups, knowledge areas |
| Agile Frameworks | Scrum, Kanban — sprints, retrospectives, WIP limits, Product Owner, Scrum Master |
| Business Analysis | Business cases, feasibility studies, BCR, stakeholder analysis |

---

## Adding New Domains

Two approaches:

### Via Admin Dashboard (Recommended)
1. Go to **ECO Domains** or **Performance Domains** tab
2. Click **New**, select the product, enter name and description
3. These domain entries serve as a master reference list

### Via Question Editing
1. Simply enter the new value when creating/editing questions in the admin dashboard
2. Or include it in the `ecoDomain`/`performanceDomain` column of a CSV import
3. The performance API will automatically aggregate and return the new domain
4. The analytics page will render it dynamically — no code changes needed

**Important:** Use consistent spelling and casing. `People` and `people` would be treated as different domains.

---

## Migration from tag/category

The columns were renamed in migration `014_rename_domain_columns.sql`:
- `questions.tag` → `questions.eco_domain`
- `questions.category` → `questions.performance_domain`
- `question_versions.tag` → `question_versions.eco_domain`
- `question_versions.category` → `question_versions.performance_domain`

CSV import accepts both old (`tag`, `category`) and new (`ecoDomain`, `performanceDomain`) column names.

---

## Question Count Summary

| Product | Exams | Questions/Exam | Total | ECO Distribution |
|---------|-------|----------------|-------|------------------|
| PMP     | 3     | 30             | 90    | People 31, Process 45, Business Environment 14 |
| CAPM    | 3     | 10             | 30    | People 8, Process 17, Business Environment 5 |
