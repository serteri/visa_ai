/**
 * Google Search Console ownership tag. The tag's content comes only from the SEARCH_CONSOLE_VERIFICATION environment
 * variable: set and non-empty after trimming -> the google-site-verification meta tag is rendered with that value;
 * unset, empty or whitespace -> no tag at all. There is no built-in token.
 */
export function searchConsoleVerification(value: string | undefined): { google: string } | undefined {
  const token = value?.trim();
  return token ? { google: token } : undefined;
}
