# Question imports

These CSV files were generated from the PM Exam Pro source workbooks and are
formatted for the Admin question importer.

| File | Questions |
| --- | ---: |
| `capm-q1-2024.csv` | 25 |
| `capm-q3-2024.csv` | 25 |
| `capm-q1-2025.csv` | 25 |
| `pmp-q1-2023.csv` | 25 |
| `pmp-q4-2022.csv` | 26 |
| `pmp-q4-2023.csv` | 50 |
| `pmp-q4-2024.csv` | 25 |
| **Total** | **201** |

All questions import as drafts. Create the target product and exam first, then
select that exam in Admin > Questions before importing its CSV.

Regenerate the files from the default source directory:

```bash
node scripts/convert-question-workbooks.mjs
```

Or provide explicit input and output directories:

```bash
node scripts/convert-question-workbooks.mjs "/path/to/workbooks" imports/questions
```
