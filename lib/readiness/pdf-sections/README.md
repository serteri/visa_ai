# PDF Modular Refactor

This directory contains the modular PDF generation system that replaces the original 4,286-line monolithic `generate-pdf.ts`.

## Status: 🚧 In Progress (Phase 1/5)

**Goal**: Expand PDF from 8-11 pages to 80 pages with genuine premium content.

**Progress**:
- ✅ Task #2: Modular structure created
- 🔄 Task #3: Extracting functions (in progress)
- ⏳ Task #4: Write static content library
- ⏳ Task #5: Expand data-driven sections
- ⏳ Task #6: Add visual elements
- ⏳ Task #7: Integration & testing

## Structure

```
lib/readiness/
├── pdf-sections/        # Section render functions (one per major section)
│   └── cover.ts        ✅ Extracted
├── pdf-components/      # Shared visual building blocks
│   └── typography.ts   ✅ Extracted (partial)
├── pdf-content/         # Static content library (NEW - will contain 15-20 pages)
├── pdf-types.ts        ✅ Shared types & PDFContext interface
└── generate-pdf.ts      🔄 Main orchestrator (will be refactored from 4286 lines → ~500)
```

## Pattern

Each section follows this pattern:

```typescript
import type { PDFContext, PDFSection } from "../pdf-types";

export const drawSectionName: PDFSection = (ctx: PDFContext): void => {
  const { doc, text, COLORS, ... } = ctx;
  // ... rendering logic
  ctx.yPosition += 10; // Mutate cursor position
};
```

## Next Steps

1. Extract remaining 50+ helper functions into modules
2. Write static content for new sections (Visa Overview, Application Guide, FAQ, etc.)
3. Wire everything into the main orchestrator
4. Test & verify 80-page output

## Timeline

- **Day 1-2**: Modular structure (✅ done)
- **Day 3-6**: Static content library
- **Day 7-9**: Expand data sections
- **Day 10-11**: Visual elements
- **Day 12-14**: Integration & testing

Estimated completion: 2 weeks from 2026-07-30
