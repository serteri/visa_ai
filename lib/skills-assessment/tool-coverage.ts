/**
 * Unresolved legacy mappings documented by scripts/test-tool-page-fees.ts's
 * Home Affairs comparison. Suppress these in the public finder until their
 * authority/source is reconciled; do not infer an authority from missing data.
 */
export const UNRESOLVED_TOOL_CODES = new Set([
  "132111",
  "224711",
  "224999",
  "234111",
  "234112",
  "234711",
  "241111",
  "241213",
  "241411",
  "241511",
  "251211",
  "251214",
  "251411",
  "252312",
  "252511",
  "252712",
  "271311",
  "272311",
  "272511",
  "312212",
  "411711",
  "421111",
]);
export function supportedToolMappings(
  mapping: Record<string, string>,
): Record<string, string> {
  return Object.fromEntries(
    Object.entries(mapping).filter(
      ([code]) => !UNRESOLVED_TOOL_CODES.has(code),
    ),
  );
}
