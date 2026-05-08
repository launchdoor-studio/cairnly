const PLACEHOLDER = /\{\{\s*([^}]+?)\s*\}\}/g;

/**
 * Replaces `{{contact.field}}` placeholders using a flat key map
 * (`contact.first_name`, …).
 */
export function renderEmailTemplate(
  template: string,
  vars: Record<string, string>,
): string {
  return template.replace(PLACEHOLDER, (_full, key: string) => {
    const k = String(key).trim();
    return vars[k] ?? "";
  });
}
