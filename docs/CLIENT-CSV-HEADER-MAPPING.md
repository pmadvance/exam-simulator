# Client CSV Header Mapping Guide

## Overview

This document explains how to convert your existing CSV format to the new simplified format that our system accepts.

## Header Changes Required

### Your Current Headers

```csv
Item ID Number,ECO (Domain.Task),Classification,Question No.,Stem,Key,Option A,Option B,Option C,Option D,Option E,Feedback
```

### New Headers (Change To)

```csv
prompt,optionA,optionB,optionC,optionD,optionE,correctAnswer,explanation,ecoDomain,performanceDomain
```

## Column Mapping

| Your Current Header | New Header | Notes |
|--------------------|------------|-------|
| `Item ID Number` | *(remove)* | Not needed - system generates IDs automatically |
| `ECO (Domain.Task)` | `ecoDomain` | Keep the same values (e.g., "I.5", "II.12") |
| `Classification` | `performanceDomain` | Keep the same values (e.g., "A - Agile", "P - Predictive") |
| `Question No.` | *(remove)* | Not needed - order is preserved from CSV rows |
| `Stem` | `prompt` | The question text |
| `Key` | `correctAnswer` | Single letter (A, B, C, D, E) or comma-separated for multiple answers (e.g., "B,E") |
| `Option A` | `optionA` | First answer option |
| `Option B` | `optionB` | Second answer option |
| `Option C` | `optionC` | Third answer option |
| `Option D` | `optionD` | Fourth answer option |
| `Option E` | `optionE` | Fifth answer option (optional) |
| `Feedback` | `explanation` | The explanation text shown after answering |

## Example Conversion

### Before (Your Current Format)

```csv
Item ID Number,ECO (Domain.Task),Classification,Question No.,Stem,Key,Option A,Option B,Option C,Option D,Option E,Feedback
840702,I.5,,1,"What should the PM do?",D,"Option A","Option B","Option C","Option D",,"Explanation here"
```

### After (New Format)

```csv
prompt,optionA,optionB,optionC,optionD,optionE,correctAnswer,explanation,ecoDomain,performanceDomain
"What should the PM do?","Option A","Option B","Option C","Option D",,D,"Explanation here",I.5,
```

## Key Differences

1. **No more Item ID** - We generate these automatically
2. **No more Question No.** - We preserve the order from your CSV
3. **Shorter headers** - Easier to work with
4. **Question type is auto-detected**:
   - Only 2 options filled (A & B) → True/False question
   - Multiple answers in Key (e.g., "B,E") → Multiple Response question
   - Otherwise → Single Choice question

## Files for Reference

- `sample/client-csv-converted-example.csv` - Your questions converted to new format
- `sample/template-questions.csv` - Clean template with examples of all question types

## Question Type Detection

The system automatically detects question types based on your data:

| Pattern | Detected Type |
|---------|---------------|
| Only A & B options have values | `true_false` |
| Key contains comma (e.g., "A,C") | `multiple_response` |
| Default (3+ options) | `single_choice` |

## Tips

1. **Remove empty columns** at the end of each row
2. **Keep text in quotes** if it contains commas or newlines
3. **Use comma** to separate multiple correct answers (e.g., "B,E")
4. **Leave optionE empty** if you only have 4 options
