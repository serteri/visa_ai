/**
 * Which knowledge-base documents the assistant's retrieval treats as occupation-list lookup tables, and which it never retrieves.
 * Kept free of database imports so tests can read it.
 */
export const OCCUPATION_LIST_SOURCES = [
  "Skilled Occupation List.md",
  "Skilled occupation list.xlsx",
  "skilled-occupation-list.json",
];

/**
 * Documents that are never retrieved, whatever the index holds. "Skilled list.md" is an obsolete duplicate of the occupation list: 122 of its
 * titles disagree with the current list (it has 225113 as Market Research Analyst; 225113 is Marketing Specialist and 225112 is Market
 * Research Analyst), 51 of its codes are not on the current list and 179 current codes are missing. The three sources above cover every
 * code on the current list. Rows already embedded in document_chunks stay there until the index is refreshed (docs/knowledge-index-stale-sources.md);
 * this list keeps them out of both retrieval buckets until then.
 */
export const RETIRED_KNOWLEDGE_SOURCES = ["Skilled list.md"];
