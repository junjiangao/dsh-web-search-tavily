window.__ModuleLoader__.load({
	id: "@junjiangao/dsh-web-search-tavily",
	factory: (require) => {
		"use strict";
		var module = { exports: {} };
		var exports = module.exports;
		"use strict";
		var __defProp = Object.defineProperty;
		var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
		var __getOwnPropNames = Object.getOwnPropertyNames;
		var __hasOwnProp = Object.prototype.hasOwnProperty;
		var __export = (target, all) => {
		  for (var name in all)
		    __defProp(target, name, { get: all[name], enumerable: true });
		};
		var __copyProps = (to, from, except, desc) => {
		  if (from && typeof from === "object" || typeof from === "function") {
		    for (let key of __getOwnPropNames(from))
		      if (!__hasOwnProp.call(to, key) && key !== except)
		        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
		  }
		  return to;
		};
		var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
		
		// client-src/client.ts
		var client_exports = {};
		__export(client_exports, {
		  DEFAULT_API_KEY_REF: () => DEFAULT_API_KEY_REF,
		  NS: () => NS,
		  TAVILY_BUNDLE: () => TAVILY_BUNDLE,
		  TAVILY_CSS: () => TAVILY_CSS,
		  TAVILY_FIELDS: () => TAVILY_FIELDS,
		  TAVILY_ROW_ID: () => TAVILY_ROW_ID,
		  TAVILY_SETTINGS_NS: () => TAVILY_SETTINGS_NS,
		  TAVILY_STYLE_ELEMENT_ID: () => TAVILY_STYLE_ELEMENT_ID,
		  apply: () => apply,
		  inject: () => inject,
		  installTavilyStyles: () => installTavilyStyles
		});
		module.exports = __toCommonJS(client_exports);
		
		// client-src/card.tsx
		var import_react = require("react");
		var import_dsh_client_ui_primitives3 = require("@deepseek-ai/dsh-client-ui-primitives");
		
		// client-src/controls.tsx
		var import_dsh_client_ui_primitives = require("@deepseek-ai/dsh-client-ui-primitives");
		
		// client-src/styles.ts
		var TAVILY_CLASS = {
		  group: "dsh-tavily-group",
		  groupTitle: "dsh-tavily-group-title",
		  panel: "dsh-tavily-panel",
		  disclosure: "dsh-tavily-disclosure",
		  disclosureIcon: "dsh-tavily-disclosure-icon",
		  row: "dsh-tavily-row",
		  field: "dsh-tavily-field",
		  head: "dsh-tavily-head",
		  label: "dsh-tavily-label",
		  hint: "dsh-tavily-hint",
		  badges: "dsh-tavily-badges",
		  reset: "dsh-tavily-reset",
		  select: "dsh-tavily-select",
		  toggle: "dsh-tavily-toggle",
		  toggleText: "dsh-tavily-toggle-text",
		  status: "dsh-tavily-status",
		  statusRef: "dsh-tavily-status-ref"
		};
		var TAVILY_STYLE_ELEMENT_ID = "dsh-web-search-tavily-styles";
		var TAVILY_CSS = `
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
		`.trim();
		function installTavilyStyles(target) {
		  const doc = target ?? (typeof document === "undefined" ? void 0 : document);
		  if (doc === void 0) return void 0;
		  if (doc.getElementById(TAVILY_STYLE_ELEMENT_ID) !== null) return TAVILY_STYLE_ELEMENT_ID;
		  const element = doc.createElement("style");
		  element.id = TAVILY_STYLE_ELEMENT_ID;
		  element.textContent = TAVILY_CSS;
		  doc.head.appendChild(element);
		  return TAVILY_STYLE_ELEMENT_ID;
		}
		
		// client-src/controls.tsx
		var import_jsx_runtime = require("react/jsx-runtime");
		function TavilyRow(props) {
		  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: TAVILY_CLASS.row, children: props.children });
		}
		function Override(props) {
		  if (!props.overridden) return null;
		  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { className: TAVILY_CLASS.badges, children: [
		    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_dsh_client_ui_primitives.Tag, { tone: "neutral", children: props.overriddenLabel }),
		    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "button", className: TAVILY_CLASS.reset, disabled: props.disabled, onClick: props.onReset, children: props.resetLabel })
		  ] });
		}
		function TavilyToggleField(props) {
		  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: TAVILY_CLASS.field, children: [
		    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: TAVILY_CLASS.toggle, children: [
		      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: TAVILY_CLASS.toggleText, children: [
		        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: TAVILY_CLASS.label, children: props.label }),
		        props.hint === "" ? null : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: TAVILY_CLASS.hint, children: props.hint })
		      ] }),
		      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
		        import_dsh_client_ui_primitives.Switch,
		        {
		          checked: props.checked,
		          disabled: props.disabled,
		          label: props.label,
		          title: props.disabled ? props.hint : void 0,
		          onChange: props.onToggle
		        }
		      )
		    ] }),
		    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Override, { ...props })
		  ] });
		}
		function TavilySelectField(props) {
		  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: TAVILY_CLASS.field, children: [
		    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: TAVILY_CLASS.head, children: [
		      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", { className: TAVILY_CLASS.label, htmlFor: props.id, children: props.label }),
		      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Override, { ...props })
		    ] }),
		    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
		      "select",
		      {
		        id: props.id,
		        className: TAVILY_CLASS.select,
		        value: props.value,
		        disabled: props.disabled,
		        onChange: (event) => {
		          props.onSelect(event.target.value);
		        },
		        children: [
		          props.value === "" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: "", children: props.unsetLabel }) : null,
		          props.options.map((option) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: option, children: option }, option))
		        ]
		      }
		    ),
		    props.hint === "" ? null : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: TAVILY_CLASS.hint, children: props.hint })
		  ] });
		}
		function TavilyCredentialStatus(props) {
		  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: TAVILY_CLASS.status, "data-plugin-credential-status": true, children: [
		    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_dsh_client_ui_primitives.Tag, { tone: props.configured ? "success" : "quiet", children: props.configured ? props.configuredLabel : props.unsetLabel }),
		    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("code", { className: TAVILY_CLASS.statusRef, children: props.reference })
		  ] });
		}
		
		// client-src/fields.ts
		var import_dsh_client_ui_primitives2 = require("@deepseek-ai/dsh-client-ui-primitives");
		var TAVILY_GROUPS = [
		  { group: "credential", collapsed: false },
		  { group: "search", collapsed: false },
		  { group: "advanced", collapsed: true }
		];
		var TAVILY_FIELDS = [
		  { field: "apiKey", kind: "password", group: "credential" },
		  { field: "apiKeyEnv", kind: "text", group: "credential" },
		  { field: "searchDepth", kind: "enum", options: ["ultra-fast", "fast", "basic", "advanced"], group: "search" },
		  { field: "includeDomains", kind: "list", group: "search" },
		  { field: "excludeDomains", kind: "list", group: "search" },
		  { field: "language", kind: "text", group: "search" },
		  { field: "filterByLanguage", kind: "boolean", group: "search", requires: "language" },
		  { field: "includeDomainsMode", kind: "enum", options: ["restrict", "prefer"], group: "advanced", requires: "includeDomains" },
		  { field: "includePublishedDate", kind: "boolean", group: "advanced" }
		];
		function fieldsOf(group) {
		  return TAVILY_FIELDS.filter((field) => field.group === group);
		}
		function fieldEnabled(field, draftOf) {
		  return field.requires === void 0 || draftOf(field.requires).trim().length > 0;
		}
		function booleanWrite(text) {
		  if (text === "true") return { kind: "set", value: true };
		  if (text === "false") return { kind: "set", value: false };
		  return void 0;
		}
		function specOf(field) {
		  switch (field.kind) {
		    case "number":
		      return (0, import_dsh_client_ui_primitives2.settingsNumberField)(field.field);
		    case "boolean":
		      return {
		        field: field.field,
		        format: (value) => value === true ? "true" : value === false ? "false" : "",
		        parse: booleanWrite
		      };
		    case "enum":
		      return {
		        field: field.field,
		        format: (value) => typeof value === "boolean" ? String(value) : typeof value === "string" ? value : "",
		        parse: (text) => {
		          if (text === "") return { kind: "clear" };
		          if (text === "true" || text === "false") return booleanWrite(text);
		          return field.options?.includes(text) === true ? { kind: "set", value: text } : void 0;
		        }
		      };
		    case "list":
		      return {
		        field: field.field,
		        format: (value) => Array.isArray(value) ? value.join(", ") : "",
		        parse: (text) => {
		          const members = text.split(",").map((item) => item.trim()).filter((item) => item.length > 0);
		          return members.length === 0 ? { kind: "clear" } : { kind: "set", value: members };
		        }
		      };
		    case "password":
		    case "text":
		      return (0, import_dsh_client_ui_primitives2.settingsTextField)(field.field);
		  }
		}
		
		// client-src/card.tsx
		var import_jsx_runtime2 = require("react/jsx-runtime");
		function copyOf(t, key) {
		  const text = t(key);
		  return text === key ? "" : text;
		}
		function fieldControl(field, state, face, enabled) {
		  const draft = state.fields[field.field];
		  const lockedHint = copyOf(face.t, `locked.${field.field}`);
		  const common = {
		    id: `plugin-config-tavily-${field.field}`,
		    label: copyOf(face.t, `field.${field.field}`) || field.field,
		    // A locked control says why instead of repeating what it would do.
		    hint: enabled ? copyOf(face.t, `hint.${field.field}`) : lockedHint,
		    overridden: draft?.overridden ?? false,
		    overriddenLabel: face.t("overridden"),
		    resetLabel: face.t("reset"),
		    disabled: !state.configWritable || !enabled || state.saving,
		    onReset: () => {
		      face.actions.resetField(field.field);
		    }
		  };
		  if (field.kind === "password") {
		    return /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
		      import_dsh_client_ui_primitives3.SettingsSecretField,
		      {
		        id: common.id,
		        label: common.label,
		        hint: state.keyWritable ? common.hint : face.t("credentialReadOnly"),
		        disabled: !state.keyWritable || state.saving,
		        text: draft?.text ?? "",
		        configured: state.credential?.configured ?? false,
		        stateLabel: face.t(state.literalKey ? "literalCredentialConfigured" : state.credential === void 0 ? "credentialUnknown" : state.credential.configured ? "credentialConfigured" : "credentialUnset"),
		        onEdit: (text) => {
		          face.actions.edit(field.field, text);
		        }
		      }
		    );
		  }
		  if (field.kind === "boolean") {
		    return /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
		      TavilyToggleField,
		      {
		        ...common,
		        checked: draft?.text === "true",
		        onToggle: (next) => {
		          face.actions.edit(field.field, String(next));
		        }
		      }
		    );
		  }
		  if (field.kind === "enum") {
		    return /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
		      TavilySelectField,
		      {
		        ...common,
		        value: draft?.text ?? "",
		        options: field.options ?? [],
		        unsetLabel: face.t("unsetOption"),
		        onSelect: (next) => {
		          face.actions.edit(field.field, next);
		        }
		      }
		    );
		  }
		  return /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
		    import_dsh_client_ui_primitives3.SettingsValueField,
		    {
		      ...common,
		      text: draft?.text ?? "",
		      invalid: draft?.invalid ?? false,
		      invalidLabel: face.t("invalidNumber"),
		      numeric: field.kind === "number",
		      onEdit: (text) => {
		        face.actions.edit(field.field, text);
		      }
		    }
		  );
		}
		function groupHeader(entry, open, onToggle, face) {
		  const title = copyOf(face.t, `group.${entry.group}`) || entry.group;
		  if (!entry.collapsed) return /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("h3", { className: TAVILY_CLASS.groupTitle, children: title });
		  const panelId = `plugin-config-tavily-panel-${entry.group}`;
		  return /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(
		    "button",
		    {
		      type: "button",
		      className: TAVILY_CLASS.disclosure,
		      "aria-expanded": open,
		      "aria-controls": panelId,
		      onClick: onToggle,
		      children: [
		        open ? /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(import_dsh_client_ui_primitives3.IconChevronDownOutlineRegular, { size: 12, className: TAVILY_CLASS.disclosureIcon }) : /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(import_dsh_client_ui_primitives3.IconChevronRightOutlineRegular, { size: 12, className: TAVILY_CLASS.disclosureIcon }),
		        title
		      ]
		    }
		  );
		}
		function groupRows(entry, state, face) {
		  const draftOf = (name) => state.fields[name]?.text ?? "";
		  return /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(import_jsx_runtime2.Fragment, { children: [
		    entry.group === "credential" && state.credential !== void 0 ? /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(TavilyRow, { children: /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
		      TavilyCredentialStatus,
		      {
		        configured: state.credential.configured,
		        reference: state.credential.ref,
		        configuredLabel: face.t(state.literalKey ? "literalCredentialConfigured" : "credentialConfigured"),
		        unsetLabel: face.t("credentialUnset")
		      }
		    ) }) : null,
		    fieldsOf(entry.group).map((field) => /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(TavilyRow, { children: fieldControl(field, state, face, fieldEnabled(field, draftOf)) }, field.field))
		  ] });
		}
		function TavilyCard(props, face) {
		  const state = (0, import_react.useSyncExternalStore)(face.store.subscribe, face.store.getSnapshot);
		  const [advancedOpen, setAdvancedOpen] = (0, import_react.useState)(false);
		  if (props.view === "summary") return /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("p", { children: face.t("summary") });
		  return /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(import_dsh_client_ui_primitives3.SettingsForm, { labels: face.labels, state, onSave: face.actions.save, onDiscard: face.actions.discard, children: [
		    /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(TavilyRow, { children: /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
		      TavilyToggleField,
		      {
		        id: "plugin-config-tavily-enabled",
		        label: face.t("enabled"),
		        hint: face.t(state.selectionWritable ? "enabledHint" : "selectionUnavailable"),
		        checked: state.enabled,
		        disabled: !state.selectionWritable || state.saving,
		        overridden: false,
		        overriddenLabel: "",
		        resetLabel: "",
		        onReset: () => {
		        },
		        onToggle: face.actions.select
		      }
		    ) }),
		    TAVILY_GROUPS.map((entry) => /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("section", { className: TAVILY_CLASS.group, "data-tavily-group": entry.group, children: [
		      groupHeader(entry, advancedOpen, () => {
		        setAdvancedOpen(!advancedOpen);
		      }, face),
		      entry.collapsed ? /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
		        "div",
		        {
		          id: `plugin-config-tavily-panel-${entry.group}`,
		          className: TAVILY_CLASS.panel,
		          hidden: !advancedOpen,
		          children: groupRows(entry, state, face)
		        }
		      ) : groupRows(entry, state, face)
		    ] }, entry.group))
		  ] });
		}
		
		// client-src/controller.ts
		var import_dsh_client_store = require("@deepseek-ai/dsh-client-store");
		var import_dsh_client_ui_primitives4 = require("@deepseek-ai/dsh-client-ui-primitives");
		var DEFAULT_API_KEY_REF = "TAVILY_API_KEY";
		var TAVILY_SETTINGS_NS = "web-search-tavily";
		var TAVILY_BUNDLE = "@junjiangao/dsh-web-search-tavily";
		var TAVILY_ROW_ID = "web-search-tavily";
		var TavilyCardController = class {
		  constructor(scope, web, describe) {
		    this.scope = scope;
		    this.web = web;
		    this.describe = describe;
		    this.form = new import_dsh_client_ui_primitives4.SettingsFormModel({
		      getSnapshot: () => ({ ...scope.getSnapshot(), writable: scope.getSnapshot().writable || this.keyWritable() }),
		      subscribe: (listener) => scope.subscribe(listener),
		      mutate: (ops, revision) => scope.mutate(ops, revision)
		    }, TAVILY_FIELDS.filter((field) => field.kind !== "password").map(specOf), [
		      { field: "apiKey", write: (value) => this.writeKey(value) }
		    ]);
		    this.selection = web === void 0 ? void 0 : new import_dsh_client_ui_primitives4.SettingsFormModel(web, [
		      (0, import_dsh_client_ui_primitives4.settingsTextField)("searchProvider"),
		      (0, import_dsh_client_ui_primitives4.settingsTextField)("fetchProvider")
		    ]);
		    this.store = (0, import_dsh_client_store.createSnapshotStore)(this.projection());
		    for (const form of [this.form, this.selection]) {
		      if (form !== void 0) this.disposers.push(form.bind(() => this.projection()).subscribe(() => this.publish()));
		    }
		    this.disposers.push(scope.subscribe(() => {
		      void this.readCredential();
		    }));
		    if (describe !== void 0) this.disposers.push(describe.subscribe(() => this.publish()));
		  }
		  scope;
		  web;
		  describe;
		  form;
		  selection;
		  store;
		  credential;
		  credentials;
		  detachCredentials;
		  disposers = [];
		  generation = 0;
		  disposed = false;
		  saving = false;
		  failed = false;
		  previous;
		  /** 每次远端重挂都重建订阅；旧请求和旧 disposer 不影响新连接。 */
		  attachCredentials(remote, credentials) {
		    this.detachCredentials?.();
		    if (this.disposed) return () => {
		    };
		    this.credentials = credentials;
		    const off = remote.$on("credentials/reference-updated", (ref) => {
		      if (ref === refOf(this.scope.getSnapshot().value)) void this.readCredential();
		    });
		    const detach = () => {
		      if (this.detachCredentials !== detach) return;
		      off();
		      this.generation++;
		      this.credentials = void 0;
		      this.credential = void 0;
		      this.detachCredentials = void 0;
		      this.publish();
		    };
		    this.detachCredentials = detach;
		    void this.readCredential();
		    return detach;
		  }
		  inject() {
		    const actions = this.form.actions();
		    return {
		      store: this.store,
		      actions: {
		        edit: (field, text) => {
		          if (!this.saving) {
		            this.failed = false;
		            actions.edit(field, text);
		          }
		        },
		        resetField: (field) => {
		          if (!this.saving) {
		            this.failed = false;
		            actions.resetField(field);
		          }
		        },
		        save: () => {
		          void this.save();
		        },
		        discard: () => {
		          if (this.saving) return;
		          this.failed = false;
		          actions.discard();
		          this.selection?.actions().discard();
		          this.previous = void 0;
		          this.publish();
		        },
		        select: (enabled) => this.select(enabled)
		      }
		    };
		  }
		  dispose() {
		    this.disposed = true;
		    this.detachCredentials?.();
		    this.generation++;
		    for (const dispose of this.disposers.splice(0)) dispose();
		    this.form.dispose();
		    this.selection?.dispose();
		  }
		  select(enabled) {
		    if (this.saving || this.selection === void 0 || !this.web?.getSnapshot().writable) return;
		    this.failed = false;
		    const snapshot = this.web.getSnapshot();
		    const current = snapshot.value;
		    if (enabled && current?.searchProvider !== "tavily") {
		      this.previous = {
		        searchProvider: stringOf(current?.searchProvider, "deepseek-official"),
		        fetchProvider: stringOf(current?.fetchProvider, "http")
		      };
		    }
		    const settings = this.scope.getSnapshot().value;
		    const base = snapshot.base;
		    const inheritedSearch = stringOf(base?.searchProvider, "deepseek-official");
		    const target = enabled ? { searchProvider: "tavily", fetchProvider: "http" } : {
		      searchProvider: this.previous?.searchProvider ?? stringOf(
		        settings?.previousSearchProvider,
		        inheritedSearch === "tavily" ? "deepseek-official" : inheritedSearch
		      ),
		      fetchProvider: this.previous?.fetchProvider ?? stringOf(settings?.previousFetchProvider, stringOf(base?.fetchProvider, "http"))
		    };
		    if (!enabled && current?.searchProvider !== "tavily") {
		      this.selection.actions().discard();
		      this.previous = void 0;
		    } else {
		      for (const [key, value] of Object.entries(target)) {
		        if (base?.[key] === value) this.selection.actions().resetField(key);
		        else this.selection.actions().edit(key, value);
		      }
		    }
		    this.publish();
		  }
		  async save() {
		    if (this.saving || this.disposed || this.projection().invalid) return;
		    this.saving = true;
		    this.failed = false;
		    this.publish();
		    try {
		      await this.form.save();
		      if (this.disposed) return;
		      if (this.form.shell().failed || this.form.shell().dirty) {
		        this.failed = true;
		        return;
		      }
		      this.form.actions().discard();
		      if (this.selection?.shell().dirty && this.previous !== void 0) {
		        const snapshot = this.scope.getSnapshot();
		        if (!await this.scope.mutate([
		          { op: "set", path: ["previousSearchProvider"], value: this.previous.searchProvider },
		          { op: "set", path: ["previousFetchProvider"], value: this.previous.fetchProvider }
		        ], snapshot.revision)) {
		          this.failed = true;
		          return;
		        }
		      }
		      if (this.disposed) return;
		      await this.selection?.save();
		      if (this.selection?.shell().failed || this.selection?.shell().dirty) this.failed = true;
		      else {
		        this.selection?.actions().discard();
		        this.previous = void 0;
		      }
		    } catch {
		      this.failed = true;
		    } finally {
		      this.saving = false;
		      this.publish();
		    }
		  }
		  async writeKey(value) {
		    const credentials = this.credentials;
		    if (credentials === void 0 || this.disposed) return false;
		    const snapshot = this.scope.getSnapshot();
		    const ref = refOf(snapshot.value);
		    const view = await credentials.describe([ref]);
		    if (!view.ok || !view.value[ref]?.writable || this.disposed || credentials !== this.credentials || ref !== refOf(this.scope.getSnapshot().value)) return false;
		    const result = await credentials.set(ref, value);
		    if (!result.ok || this.disposed || credentials !== this.credentials || ref !== refOf(this.scope.getSnapshot().value)) return false;
		    if (this.literalKey() && !await this.scope.mutate([
		      { op: "set", path: ["useCredential"], value: true }
		    ], snapshot.revision)) return false;
		    await this.readCredential();
		    return true;
		  }
		  async readCredential() {
		    const generation = ++this.generation;
		    const credentials = this.credentials;
		    const ref = refOf(this.scope.getSnapshot().value);
		    this.credential = void 0;
		    this.publish();
		    if (credentials === void 0 || this.disposed) return;
		    try {
		      const response = await credentials.describe([ref]);
		      if (this.disposed || generation !== this.generation || credentials !== this.credentials || ref !== refOf(this.scope.getSnapshot().value) || !response.ok) return;
		      const view = response.value[ref];
		      if (view === void 0) return;
		      this.credential = { ref, configured: view.configured, writable: view.writable };
		      this.publish();
		    } catch {
		    }
		  }
		  literalKey() {
		    if (this.scope.getSnapshot().value?.useCredential === true) return false;
		    const value = this.scope.getSnapshot().value?.apiKey;
		    if (typeof value === "string" && value.trim() !== "") return true;
		    return this.describe?.getSnapshot().view?.namespaces.find((row) => row.ns === TAVILY_SETTINGS_NS)?.secrets?.some((secret) => secret.path.length === 1 && secret.path[0] === "apiKey" && secret.set) ?? false;
		  }
		  keyWritable() {
		    return this.credentials !== void 0 && this.credential?.writable === true && (!this.literalKey() || this.scope.getSnapshot().writable);
		  }
		  publish() {
		    if (!this.disposed) this.store.set(this.projection());
		  }
		  projection() {
		    const fields = Object.fromEntries(TAVILY_FIELDS.map((field) => [field.field, this.form.field(field.field)]));
		    const form = this.form.shell();
		    const selection = this.selection?.shell();
		    const literalKey = this.literalKey();
		    const selected = this.selection?.field("searchProvider").text === "tavily" && this.selection.field("fetchProvider").text === "http";
		    return {
		      ...form,
		      writable: form.writable || selection?.writable === true,
		      dirty: form.dirty || selection?.dirty === true,
		      invalid: form.invalid || selection?.invalid === true,
		      saving: this.saving,
		      failed: this.failed || form.failed || selection?.failed === true,
		      fields,
		      credential: literalKey ? { ref: "apiKey", configured: true, writable: this.keyWritable() } : this.credential,
		      configWritable: this.scope.getSnapshot().writable,
		      keyWritable: this.keyWritable(),
		      literalKey,
		      enabled: selected,
		      selectionWritable: selection?.available === true && selection.writable && this.scope.getSnapshot().writable
		    };
		  }
		};
		function refOf(section) {
		  return stringOf(section?.apiKeyEnv, DEFAULT_API_KEY_REF);
		}
		function stringOf(value, fallback) {
		  return typeof value === "string" && value.trim() !== "" ? value.trim() : fallback;
		}
		
		// client-src/locales.ts
		var NS = "webSearchTavily";
		var zh = {
		  summary: "\u901A\u8FC7 Tavily \u63D0\u4F9B\u7F51\u7EDC\u641C\u7D22\uFF1B\u672A\u914D\u7F6E\u5BC6\u94A5\u65F6\u8FDB\u5165\u65E0\u5BC6\u94A5\u6A21\u5F0F\u3002",
		  credentialConfigured: "\u5BC6\u94A5\u5DF2\u914D\u7F6E",
		  literalCredentialConfigured: "\u914D\u7F6E\u4E2D\u5B58\u5728\u5B57\u9762\u5BC6\u94A5\u5B57\u6BB5\uFF08\u503C\u5DF2\u9690\u85CF\uFF09",
		  credentialUnset: "\u6B64\u51ED\u636E\u5F15\u7528\u5C1A\u672A\u914D\u7F6E\u5BC6\u94A5",
		  credentialUnknown: "\u5BC6\u94A5\u72B6\u6001\u6682\u4E0D\u53EF\u7528",
		  credentialReadOnly: "\u51ED\u636E\u670D\u52A1\u5C1A\u672A\u5C31\u7EEA\u6216\u4E0D\u63A5\u53D7\u5199\u5165\uFF1B\u53EF\u5728\u5BBF\u4E3B\u51ED\u636E\u8BBE\u7F6E\u4E2D\u914D\u7F6E\u6B64\u5F15\u7528\u3002",
		  enabled: "\u4F7F\u7528 Tavily \u641C\u7D22",
		  enabledHint: "\u4FDD\u5B58\u540E\u540C\u65F6\u5207\u6362\u4E3A Tavily \u641C\u7D22\u548C HTTP \u7F51\u9875\u6293\u53D6\uFF1B\u5173\u95ED\u5E76\u4FDD\u5B58\u53EF\u6062\u590D\u6B64\u524D\u7684\u63D0\u4F9B\u65B9\u3002",
		  selectionUnavailable: "\u9700\u8981\u5BBF\u4E3B\u63D0\u4F9B\u53EF\u5199\u7684 web \u914D\u7F6E\u3002\u8BF7\u5347\u7EA7\u5BBF\u4E3B\uFF0C\u6216\u624B\u52A8\u8BBE\u7F6E searchProvider: tavily\u3001fetchProvider: http\u3002",
		  save: "\u4FDD\u5B58",
		  saving: "\u4FDD\u5B58\u4E2D\u2026",
		  readOnly: "\u5F53\u524D\u90E8\u7F72\u4EE5\u53EA\u8BFB\u65B9\u5F0F\u4FDD\u5B58\u914D\u7F6E\uFF0C\u4FEE\u6539\u4E0D\u4F1A\u5199\u5165\u3002",
		  unavailable: "\u8BE5\u63D2\u4EF6\u5F53\u524D\u672A\u7531 Host \u63D0\u4F9B\u914D\u7F6E\u3002",
		  saveFailed: "Host \u672A\u63A5\u53D7\u8FD9\u6B21\u4FDD\u5B58\uFF0C\u8349\u7A3F\u5DF2\u4FDD\u7559\u3002",
		  overridden: "\u5DF2\u8986\u76D6",
		  reset: "\u6062\u590D\u9ED8\u8BA4",
		  invalidNumber: "\u8BF7\u8F93\u5165\u6570\u5B57",
		  unsetOption: "\u9ED8\u8BA4\uFF08\u4E0D\u8BBE\u7F6E\uFF09",
		  "group.credential": "\u51ED\u636E",
		  "group.search": "\u68C0\u7D22",
		  "group.advanced": "\u9AD8\u7EA7",
		  "field.apiKey": "API \u5BC6\u94A5",
		  "hint.apiKey": "\u4FDD\u5B58\u5230\u4E0B\u65B9\u5F15\u7528\u5BF9\u5E94\u7684\u5BBF\u4E3B\u51ED\u636E\u5B58\u50A8\uFF1B\u7559\u7A7A\u4FDD\u7559\u73B0\u6709\u5BC6\u94A5\uFF0C\u4FDD\u5B58\u6210\u529F\u540E\u8F93\u5165\u6846\u4F1A\u6E05\u7A7A\u3002",
		  "field.apiKeyEnv": "\u51ED\u636E\u5F15\u7528 / \u73AF\u5883\u53D8\u91CF",
		  "hint.apiKeyEnv": "\u4FDD\u5B58\u5BC6\u94A5\u7684\u73AF\u5883\u53D8\u91CF\u540D\uFF0C\u9ED8\u8BA4 TAVILY_API_KEY\u3002",
		  "field.searchDepth": "\u68C0\u7D22\u6DF1\u5EA6",
		  "hint.searchDepth": "basic \u517C\u987E\u901F\u5EA6\u4E0E\u8D28\u91CF\uFF1Badvanced \u53EC\u56DE\u66F4\u5168\uFF0C\u4F46\u66F4\u6162\u4E5F\u66F4\u8D35\u3002",
		  "field.includeDomains": "\u9650\u5B9A\u57DF\u540D",
		  "hint.includeDomains": "\u9017\u53F7\u5206\u9694\uFF0C\u4F8B\u5982 a.com, b.com\uFF1B\u7559\u7A7A\u5219\u4E0D\u9650\u5236\u6765\u6E90\u3002",
		  "field.includeDomainsMode": "\u57DF\u540D\u9650\u5B9A\u65B9\u5F0F",
		  "hint.includeDomainsMode": "restrict \u53EA\u68C0\u7D22\u8FD9\u4E9B\u57DF\u540D\uFF1Bprefer \u4EC5\u52A0\u6743\uFF0C\u4ECD\u68C0\u7D22\u5168\u7F51\u3002",
		  "locked.includeDomainsMode": "\u9700\u5148\u586B\u5199\u300C\u9650\u5B9A\u57DF\u540D\u300D\u540E\u53EF\u7528\u3002",
		  "field.excludeDomains": "\u6392\u9664\u57DF\u540D",
		  "hint.excludeDomains": "\u9017\u53F7\u5206\u9694\uFF0C\u4F8B\u5982 a.com, b.com\u3002",
		  "field.includePublishedDate": "\u8FD4\u56DE\u53D1\u5E03\u65E5\u671F",
		  "hint.includePublishedDate": "\u7ED3\u679C\u9644\u5E26\u53D1\u5E03\u65E5\u671F\uFF0C\u4FBF\u4E8E\u5224\u65AD\u4FE1\u606F\u65F6\u6548\uFF1BTavily \u81EA\u8EAB\u9ED8\u8BA4\u4E0D\u8FD4\u56DE\u3002",
		  "field.language": "\u7ED3\u679C\u8BED\u8A00",
		  "hint.language": "\u8BED\u8A00\u4EE3\u7801\uFF0C\u4F8B\u5982 zh\u3001en\uFF1B\u7559\u7A7A\u4E0D\u9650\u5B9A\u3002",
		  "field.filterByLanguage": "\u4E25\u683C\u6309\u8BED\u8A00\u8FC7\u6EE4",
		  "hint.filterByLanguage": "\u4E22\u5F03\u5176\u4ED6\u8BED\u8A00\u7684\u7ED3\u679C\uFF0C\u6BD4\u300C\u7ED3\u679C\u8BED\u8A00\u300D\u66F4\u4E25\u683C\u3002",
		  "locked.filterByLanguage": "\u9700\u5148\u586B\u5199\u300C\u7ED3\u679C\u8BED\u8A00\u300D\u540E\u53EF\u7528\u3002"
		};
		var en = {
		  summary: "Serves web search through Tavily; runs keyless until a key is configured.",
		  credentialConfigured: "Key configured",
		  literalCredentialConfigured: "Literal key field present in configuration (value hidden)",
		  credentialUnset: "No key stored for this reference",
		  credentialUnknown: "Key status unavailable",
		  credentialReadOnly: "The credentials service is unavailable or read-only. Configure this reference in the Host credential settings.",
		  enabled: "Use Tavily search",
		  enabledHint: "Save to select Tavily search and HTTP fetch together. Disable and save to restore the previous providers.",
		  selectionUnavailable: "A writable web namespace is required. Upgrade the Host or set searchProvider: tavily and fetchProvider: http manually.",
		  save: "Save",
		  saving: "Saving\u2026",
		  readOnly: "This deployment stores settings read-only; edits are not written.",
		  unavailable: "The Host does not serve configuration for this plugin.",
		  saveFailed: "The Host refused this save; the drafts were kept.",
		  overridden: "Overridden",
		  reset: "Reset",
		  invalidNumber: "Enter a number",
		  unsetOption: "Default (not set)",
		  "group.credential": "Credentials",
		  "group.search": "Retrieval",
		  "group.advanced": "Advanced",
		  "field.apiKey": "API key",
		  "hint.apiKey": "Stored in Host credentials under the reference below. Leave blank to keep the key; the input clears after a successful save.",
		  "field.apiKeyEnv": "Credential reference / environment variable",
		  "hint.apiKeyEnv": "Environment variable holding the key; defaults to TAVILY_API_KEY.",
		  "field.searchDepth": "Search depth",
		  "hint.searchDepth": "basic balances speed and quality; advanced recalls more but is slower and costs more.",
		  "field.includeDomains": "Include domains",
		  "hint.includeDomains": "Comma separated, e.g. a.com, b.com; blank leaves sources unrestricted.",
		  "field.includeDomainsMode": "Domain restriction mode",
		  "hint.includeDomainsMode": "restrict searches only those domains; prefer weights them but still searches the web.",
		  "locked.includeDomainsMode": "Set include domains first.",
		  "field.excludeDomains": "Exclude domains",
		  "hint.excludeDomains": "Comma separated, e.g. a.com, b.com.",
		  "field.includePublishedDate": "Return publication dates",
		  "hint.includePublishedDate": "Attach each result's publication date so freshness is visible; Tavily omits it by default.",
		  "field.language": "Result language",
		  "hint.language": "Language code, e.g. zh, en; blank leaves it open.",
		  "field.filterByLanguage": "Filter strictly by language",
		  "hint.filterByLanguage": "Drops results in other languages, stricter than result language.",
		  "locked.filterByLanguage": "Set result language first."
		};
		var dictionaries = { zh, en };
		
		// client-src/client.ts
		var inject = ["slots", "locale", "configForms"];
		function apply(ctx) {
		  installTavilyStyles();
		  const t = ctx.locale.bind(NS);
		  ctx.effect(() => ctx.locale.register(NS, dictionaries), "web-search-tavily: dictionaries");
		  const controller = new TavilyCardController(
		    ctx.configForms.get(TAVILY_SETTINGS_NS),
		    ctx.configForms.get("web"),
		    ctx.configForms.describe?.()
		  );
		  ctx.effect(() => () => {
		    controller.dispose();
		  }, "web-search-tavily: form subscription");
		  ctx.inject(["remote", "remote.credentials"], (scoped) => {
		    const remote = scoped.get("remote");
		    const credentials = scoped.get("remote.credentials");
		    if (remote === void 0 || credentials === void 0) return;
		    scoped.effect(() => controller.attachCredentials(remote, credentials), "web-search-tavily: credentials");
		  });
		  const face = {
		    fields: TAVILY_FIELDS,
		    t,
		    labels: {
		      unavailable: t("unavailable"),
		      readOnly: t("readOnly"),
		      saveFailed: t("saveFailed"),
		      save: t("save"),
		      saving: t("saving")
		    },
		    ...controller.inject()
		  };
		  const card = (props) => TavilyCard(props, face);
		  let bundleName = TAVILY_BUNDLE;
		  let surfaces;
		  const mount = () => {
		    surfaces?.();
		    surfaces = ctx.effect(() => ctx.configForms.whileServed([TAVILY_SETTINGS_NS], () => {
		      const bundle = ctx.slots.inject("plugins.bundle.config", () => ctx.slots.register(
		        { name: "plugins.bundle.config", key: bundleName },
		        card
		      ));
		      return () => {
		        if (typeof bundle === "function") bundle();
		      };
		    }), "web-search-tavily: bundle configuration surface");
		  };
		  mount();
		  ctx.inject(["remote", "remote.pluginManager"], (scoped) => {
		    const manager = scoped.get("remote.pluginManager");
		    if (manager === void 0) return;
		    let active = true;
		    scoped.effect(() => () => {
		      active = false;
		    }, "web-search-tavily: manager lookup");
		    void manager.listBundles().then((answer) => {
		      if (!active || !answer.ok) return;
		      const declared = answer.value.find((bundle) => bundle.rows?.some(
		        (row) => row.rowId === TAVILY_ROW_ID && row.moduleName === TAVILY_BUNDLE
		      ));
		      if (declared === void 0 || declared.name === bundleName) return;
		      bundleName = declared.name;
		      mount();
		    }).catch(() => {
		    });
		  });
		}
		
		return module.exports;
	}
});
