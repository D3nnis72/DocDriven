# Problem-entry writing check

Checked on 2026-11-05 with a native agent using the full writing guide and the
existing language skills. The baseline used the old guide; the second run used
the revised guide. These are wording checks, not statistical reliability claims.

## Scenarios

- Missing supplier-column sorting; screenshot also contains unrelated empty spend cells.
- Canceled-project deletion reported; screenshot only shows In Progress, no error.
- Approval available in List but missing in Compare; answers are preserved.
- Optional RFQ rows partly configured; existing projects, explicit refusal and Excel remain open.
- Priority overview for partial offers, currency, Compare approval and old borders.

## Observations

The sorting case was repeated five times in each run. All five baseline versions
added an investigation into the unrelated empty spend cells, for example:
“Das allein belegt keinen Berechnungsfehler. Die Ursache der fehlenden Werte ist
noch zu prüfen.” All five revised versions stayed on sorting and its expected
behaviour. Both runs retained the missing deletion error and the scope of the
partial RFQ fix. The revised overview shortened each impact sentence; repeated
next-action fields remain a Visual Markdown formatting issue.

The change therefore gives issue notes a concrete output shape while preserving
relevant uncertainty and partial-fix scope. Explanatory documents keep their
separate example-led guidance.
