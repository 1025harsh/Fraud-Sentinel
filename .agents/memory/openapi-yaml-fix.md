---
name: OpenAPI YAML structure fix pattern
description: How to recover from new paths landing inside components section after appending to openapi.yaml, and how to avoid Orval duplicate export errors
---

## Rule
When new paths are appended to `lib/api-spec/openapi.yaml` (e.g. via `cat >>`), they sometimes land *after* the `components:` section instead of before it — causing Orval to error with "Property /x is not expected to be here".

**How to apply:**
1. Use a Python script to split the file: find the `components:` line and any new schema sentinel line (first new schema name), then reconstruct: `original_paths + new_paths + components_header + original_schemas + new_schemas`.
2. After restructuring, check for any `$ref` pointing to named schemas that were removed — inline them directly in the path's `requestBody` instead.
3. After codegen runs, check for TS2308 duplicate export errors. These happen when the same type name exists in both `lib/api-zod/src/generated/api.ts` (Zod schemas) AND `lib/api-zod/src/generated/types/` (TS types). Fix by editing `lib/api-zod/src/index.ts` to enumerate individual type files (skipping the conflicting ones) rather than `export * from "./generated/types"`.

**Why:**
- Orval generates both Zod validators (`api.ts`) and TypeScript types (`types/`) from the same spec; if both export the same name, `lib/api-zod/src/index.ts` gets a TS2308 ambiguous re-export.
- The `index.ts` fix must be done manually since Orval regenerates `types/index.ts` on every codegen run — only `lib/api-zod/src/index.ts` is hand-maintained.
