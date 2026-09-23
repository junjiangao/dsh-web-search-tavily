/**
 * The card's own stylesheet.
 *
 * The shell shares components through its frozen module table, but it does not
 * share its CSS modules: a third-party bundle cannot import the hashed classes
 * of `fields.module.css`. This module therefore ships the few rules the card
 * needs as one text payload and installs it as a single `<style>` element, so
 * presentation still lives in CSS rather than in inline styles, and every rule
 * reads the same `--dsw-alias-*` tokens the shell's own settings pages use.
 *
 * The rules mirror the shell's shipped field chrome
 * (`ui-primitives/src/settings-form/fields.module.css`) and its enum picker
 * (`ui-settings-models/.../ModelsSection.module.css`) so a row this card draws
 * sits in the same rhythm as a row the shell draws.
 */

/** Class names the card's own controls render. */
export const TAVILY_CLASS = {
  group: 'dsh-tavily-group',
  groupTitle: 'dsh-tavily-group-title',
  panel: 'dsh-tavily-panel',
  disclosure: 'dsh-tavily-disclosure',
  disclosureIcon: 'dsh-tavily-disclosure-icon',
  row: 'dsh-tavily-row',
  field: 'dsh-tavily-field',
  head: 'dsh-tavily-head',
  label: 'dsh-tavily-label',
  hint: 'dsh-tavily-hint',
  badges: 'dsh-tavily-badges',
  reset: 'dsh-tavily-reset',
  select: 'dsh-tavily-select',
  toggle: 'dsh-tavily-toggle',
  toggleText: 'dsh-tavily-toggle-text',
  status: 'dsh-tavily-status',
  statusRef: 'dsh-tavily-status-ref',
} as const

/** Id of the single `<style>` element this bundle installs. */
export const TAVILY_STYLE_ELEMENT_ID = 'dsh-web-search-tavily-styles'

/** The card's rules, written once into the document head. */
export const TAVILY_CSS = `
.${TAVILY_CLASS.group} { display: flex; flex-direction: column; }
.${TAVILY_CLASS.group} + .${TAVILY_CLASS.group} { margin-top: 4px; }

.${TAVILY_CLASS.groupTitle} {
  margin: 0;
  padding: 6px 0 0;
  font-size: 12px;
  font-weight: 500;
  line-height: 1.5;
  color: var(--dsw-alias-label-tertiary);
}

.${TAVILY_CLASS.disclosure} {
  display: flex;
  align-items: center;
  gap: 4px;
  margin: 0;
  padding: 6px 0 0;
  border: 0;
  background: none;
  font: inherit;
  font-size: 12px;
  font-weight: 500;
  line-height: 1.5;
  color: var(--dsw-alias-label-tertiary);
  cursor: pointer;
}

.${TAVILY_CLASS.disclosure}:hover { color: var(--dsw-alias-label-secondary); }
.${TAVILY_CLASS.disclosure}:focus-visible {
  outline: 2px solid var(--dsw-alias-brand-primary);
  outline-offset: 1px;
}
.${TAVILY_CLASS.disclosureIcon} { flex: none; }

.${TAVILY_CLASS.panel} { display: flex; flex-direction: column; }
.${TAVILY_CLASS.panel}[hidden] { display: none; }

.${TAVILY_CLASS.row} { display: flex; flex-direction: column; }
.${TAVILY_CLASS.row} + .${TAVILY_CLASS.row} { border-top: 0.5px solid var(--dsw-alias-border-l2); }

.${TAVILY_CLASS.field} {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 12px 0;
}

.${TAVILY_CLASS.head} { display: flex; align-items: center; gap: 8px; }

.${TAVILY_CLASS.label} {
  flex: 1;
  min-width: 0;
  font-size: 13px;
  font-weight: 500;
  line-height: 1.5;
  color: var(--dsw-alias-label-primary);
}

.${TAVILY_CLASS.hint} {
  margin: 0;
  font-size: 12px;
  line-height: 1.5;
  color: var(--dsw-alias-label-tertiary);
}

.${TAVILY_CLASS.badges} { display: inline-flex; align-items: center; gap: 8px; }

.${TAVILY_CLASS.reset} {
  border: none;
  background: none;
  padding: 0;
  font: inherit;
  font-size: 12px;
  line-height: 1.5;
  color: var(--dsw-alias-label-secondary);
  cursor: pointer;
}

.${TAVILY_CLASS.reset}:hover:not(:disabled) { color: var(--dsw-alias-label-primary); }
.${TAVILY_CLASS.reset}:disabled { cursor: default; }

/* An enum holds a handful of short options: at field width it reads as a text
   input the user is expected to fill, so it is capped like the shell's own. */
.${TAVILY_CLASS.select} {
  box-sizing: border-box;
  width: 100%;
  max-width: 240px;
  height: 34px;
  padding: 0 32px 0 12px;
  border: 0.5px solid var(--dsw-alias-border-l4);
  border-radius: 8px;
  background-color: var(--dsw-alias-bg-layer-3);
  font: inherit;
  font-size: 13px;
  line-height: 1.5;
  color: var(--dsw-alias-label-primary);
  appearance: none;
  /* Data-URI SVGs cannot resolve CSS variables; #81858C is the caption gray the
     shell's own select uses in both themes. */
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12' fill='none'%3E%3Cpath d='M3 4.5L6 7.5L9 4.5' stroke='%2381858C' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 12px center;
  background-size: 12px 12px;
  cursor: pointer;
}

.${TAVILY_CLASS.select}:focus-visible {
  outline: none;
  border-color: var(--dsw-alias-brand-primary);
}

.${TAVILY_CLASS.select}:disabled {
  color: var(--dsw-alias-label-tertiary);
  cursor: default;
}

.${TAVILY_CLASS.toggle} { display: flex; align-items: center; gap: 12px; }
.${TAVILY_CLASS.toggleText} { display: flex; flex-direction: column; gap: 2px; flex: 1; min-width: 0; }

.${TAVILY_CLASS.status} {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  padding: 12px 0;
}

.${TAVILY_CLASS.statusRef} {
  font-size: 12px;
  line-height: 1.5;
  color: var(--dsw-alias-label-secondary);
}
`.trim()

/** The slice of `Document` this installer touches, so a test can stand in for one. */
export interface StyleTarget {
  getElementById(id: string): unknown
  createElement(tag: string): { id: string; textContent: string }
  head: { appendChild(node: unknown): unknown }
}

/**
 * Install the card's rules once per document. Idempotent: a second call (a
 * reload of the client bundle, or two cards on one page) finds the element by
 * id and does nothing.
 * @param target - the document to write into; defaults to the browser's.
 * @returns the style element's id, or `undefined` when no document exists (a
 * non-browser host, e.g. the test runner).
 */
export function installTavilyStyles(target?: StyleTarget): string | undefined {
  const doc = target ?? (typeof document === 'undefined' ? undefined : document as unknown as StyleTarget)
  if (doc === undefined) return undefined
  if (doc.getElementById(TAVILY_STYLE_ELEMENT_ID) !== null) return TAVILY_STYLE_ELEMENT_ID
  const element = doc.createElement('style')
  element.id = TAVILY_STYLE_ELEMENT_ID
  element.textContent = TAVILY_CSS
  doc.head.appendChild(element)
  return TAVILY_STYLE_ELEMENT_ID
}
