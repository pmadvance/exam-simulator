# CSV Import Format Migration Guide

## Overview

The system now supports **automatic question type inference** and **5 options (A-E)**. You can import CSV files without explicitly specifying the `questionType` column - the system will automatically detect it based on the data.

---

## Client CSV to System CSV Mapping

### Column Mapping

| Client CSV Column | System CSV Column | Notes |
|-------------------|-------------------|-------|
| `Item ID Number` | *(ignored)* | System generates its own IDs |
| `ECO (Domain.Task)` | `ecoDomain` | ECO domain/task identifier |
| `Classification` | `performanceDomain` | A=Agile, H=Hybrid, P=Predictive, AG=Agnostic |
| `Question No.` | *(ignored)* | Order is preserved from CSV rows |
| `Stem` | `prompt` | The question text |
| `Key` | `correctAnswer` | Correct answer(s): A, B, C, D, E or comma-separated like "B,E" |
| `Option A` | `optionA` | First option |
| `Option B` | `optionB` | Second option |
| `Option C` | `optionC` | Third option (optional) |
| `Option D` | `optionD` | Fourth option (optional) |
| `Option E` | `optionE` | Fifth option (optional, **NEW**) |
| `Feedback` | `explanation` | Explanation/rationale for the answer |

### Automatic Question Type Inference

The system automatically detects question types based on the data:

| Condition | Detected Type | Example |
|-----------|---------------|---------|
| Only A & B options filled, C/D/E empty | `true_false` | A=True, B=False |
| Multiple answers in Key (comma-separated) | `multiple_response` | Key="B,E" |
| Default case | `single_choice` | Key="D" |

---

## Internal (System) CSV Format

```csv
questionType,prompt,optionA,optionB,optionC,optionD,optionE,correctAnswer,explanation,ecoDomain,performanceDomain,imageUrl,status,difficulty
single_choice,What is...,Option 1,Option 2,Option 3,Option 4,,C,Explanation text,II.12,P - Predictive,,published,
multiple_response,Select TWO...,A,B,C,D,E,"A,C",Explanation,I.5,A - Agile,,published,
true_false,Is this true...,True,False,,,,A,Explanation,I.2,A - Agile,,published,
```

### System CSV Columns

| Column | Required | Description |
|--------|----------|-------------|
| `questionType` | No* | `single_choice`, `multiple_response`, or `true_false`. *If omitted, auto-inferred from data |
| `prompt` | **Yes** | The question text |
| `optionA` | **Yes** | First option |
| `optionB` | **Yes** | Second option |
| `optionC` | No | Third option |
| `optionD` | No | Fourth option |
| `optionE` | No | Fifth option (**NEW**) |
| `correctAnswer` | **Yes** | Correct answer(s): single letter or comma-separated |
| `explanation` | **Yes** | Answer explanation |
| `ecoDomain` | No | ECO domain (e.g., "I.5", "II.12") |
| `performanceDomain` | No | Performance domain (e.g., "A - Agile", "P - Predictive") |
| `imageUrl` | No | URL or filename for question image |
| `status` | No | `draft` or `published` (default: `published`) |
| `difficulty` | No | Difficulty level (e.g., "easy", "medium", "hard") |

---

## Header Aliases (Alternative Column Names)

The parser accepts various column name variations:

| Standard | Accepted Aliases |
|----------|------------------|
| `prompt` | `question`, `questiontext`, `stem` |
| `optionA` | `a`, `answera`, `option a` |
| `optionB` | `b`, `answerb`, `option b` |
| `optionC` | `c`, `answerc`, `option c` |
| `optionD` | `d`, `answerd`, `option d` |
| `optionE` | `e`, `answere`, `option e` |
| `correctAnswer` | `answer`, `correct`, `key`, `keys` |
| `explanation` | `rationale`, `reasoning`, `feedback`, `explanations` |
| `questionType` | `type`, `question type` |
| `ecoDomain` | `domain`, `ecotag`, `eco(domain.task)`, `eco` |
| `performanceDomain` | `processgroup`, `perftag`, `classification` |
| `imageUrl` | `image`, `image url` |
| `difficulty` | `level` |

---

## Examples

### Example 1: Single Choice (4 options)

```csv
Stem,Key,Option A,Option B,Option C,Option D,Feedback,ECO (Domain.Task)
"What is the critical path duration?","C","12 days","15 days","18 days","20 days","The critical path is...","II.12"
```

Auto-detected as: `single_choice` (has options A-D, single answer)

### Example 2: Multiple Response (Choose 2)

```csv
Stem,Key,Option A,Option B,Option C,Option D,Option E,Feedback,ECO (Domain.Task)
"Which TWO are benefits?","A,C","Visualizes work","Eliminates PM","Limits WIP","Guarantees delivery","Reduces cost","Kanban boards...","II.5"
```

Auto-detected as: `multiple_response` (Key has comma-separated values)

### Example 3: True/False

```csv
Stem,Key,Option A,Option B,Feedback,ECO (Domain.Task)
"In Agile, the product owner prioritizes the backlog.","A","True","False","The product owner is responsible...","I.2"
```

Auto-detected as: `true_false` (only A and B options filled)

### Example 4: With Option E (5 options)

```csv
Stem,Key,Option A,Option B,Option C,Option D,Option E,Feedback
"Select the best approach:","E","Waterfall","Agile","Hybrid","Iterative","Incremental","Incremental is best..."
```

Auto-detected as: `single_choice` (has options A-E, single answer)

---

## Migration from Client CSV to System CSV

### Manual Conversion Script

If you need to convert client CSV files to the system format for editing:

```csv
# Client format:
Item ID Number,ECO (Domain.Task),Classification,Question No.,Stem,Key,Option A,Option B,Option C,Option D,Option E,Feedback

# System format:
questionType,prompt,optionA,optionB,optionC,optionD,optionE,correctAnswer,explanation,ecoDomain,performanceDomain
```

### Notes

1. **No manual conversion needed**: The system now directly accepts client CSV format
2. **Auto-detection**: `questionType` is inferred automatically
3. **Flexible columns**: Use any of the accepted aliases for column names
4. **Option E support**: Up to 5 options (A-E) are now supported

---

## Validation Rules

| Rule | Description |
|------|-------------|
| Required fields | `prompt`, `optionA`, `optionB`, `correctAnswer`, `explanation` |
| Single choice | Must have at least options A-D filled |
| True/False | Only options A and B should be filled |
| Multiple response | Key can have comma-separated values (e.g., "A,C") |
| Correct answer | Must be A, B, C, D, or E (or comma-separated for multiple response) |

---

## Error Messages

Common import errors:

| Error | Cause | Fix |
|-------|-------|-----|
| `missing prompt` | Empty question text | Fill in the Stem column |
| `missing required options A or B` | Missing Option A or B | Fill in both Option A and B |
| `single_choice needs options A-D at minimum` | Missing C or D for single choice | Fill in all options A-D |
| `invalid correctAnswer "X" for single_choice` | Answer not A-E | Use A, B, C, D, or E |
