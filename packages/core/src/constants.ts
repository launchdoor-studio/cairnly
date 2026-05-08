/** Max UTF-16 code units accepted for CSV import payloads crossing the API boundary. */
export const MAX_CONTACT_IMPORT_CSV_CHARS = 1_048_576;

/** Rows past this limit are counted but not mapped or committed server-side */
export const MAX_CONTACT_IMPORT_DATA_ROWS = 5_000;

/** Preview rows stored in parse response headers area */
export const CONTACT_IMPORT_PREVIEW_ROW_CAP = 8;
