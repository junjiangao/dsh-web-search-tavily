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
		  NS: () => NS,
		  TAVILY_BUNDLE: () => TAVILY_BUNDLE,
		  TAVILY_FIELDS: () => TAVILY_FIELDS,
		  TAVILY_ROW_CONFIG_KEY: () => TAVILY_ROW_CONFIG_KEY,
		  TAVILY_ROW_ID: () => TAVILY_ROW_ID,
		  TAVILY_SETTINGS_NS: () => TAVILY_SETTINGS_NS,
		  apply: () => apply,
		  inject: () => inject
		});
		module.exports = __toCommonJS(client_exports);
		
		// client-src/card.tsx
		var import_react = require("react");
		var import_dsh_client_ui_primitives = require("@deepseek-ai/dsh-client-ui-primitives");
		
		// client-src/controls.tsx
		var import_jsx_runtime = require("react/jsx-runtime");
		var rowStyle = { display: "flex", flexDirection: "column", gap: "4px", margin: "0 0 14px" };
		var headStyle = { display: "flex", alignItems: "center", gap: "8px" };
		var labelStyle = { fontSize: "13px", fontWeight: 500 };
		var hintStyle = { fontSize: "12px", opacity: 0.7, margin: 0 };
		var badgeStyle = { fontSize: "11px", opacity: 0.7, border: "1px solid currentColor", borderRadius: "999px", padding: "0 6px" };
		var linkStyle = { fontSize: "12px", background: "none", border: "none", padding: 0, color: "inherit", textDecoration: "underline", cursor: "pointer" };
		function TavilyToggleField(props) {
		  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: rowStyle, children: [
		    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: headStyle, children: [
		      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", { style: labelStyle, htmlFor: props.id, children: props.label }),
		      props.overridden ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: badgeStyle, children: props.overriddenLabel }) : null,
		      props.overridden ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "button", style: linkStyle, disabled: props.disabled, onClick: props.onReset, children: props.resetLabel }) : null
		    ] }),
		    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
		      "input",
		      {
		        id: props.id,
		        type: "checkbox",
		        checked: props.checked,
		        disabled: props.disabled,
		        onChange: (event) => {
		          props.onToggle(event.target.checked);
		        }
		      }
		    ),
		    props.hint === "" ? null : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { style: hintStyle, children: props.hint })
		  ] });
		}
		function TavilySelectField(props) {
		  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: rowStyle, children: [
		    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: headStyle, children: [
		      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", { style: labelStyle, htmlFor: props.id, children: props.label }),
		      props.overridden ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: badgeStyle, children: props.overriddenLabel }) : null,
		      props.overridden ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "button", style: linkStyle, disabled: props.disabled, onClick: props.onReset, children: props.resetLabel }) : null
		    ] }),
		    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
		      "select",
		      {
		        id: props.id,
		        value: props.value,
		        disabled: props.disabled,
		        onChange: (event) => {
		          props.onSelect(event.target.value);
		        },
		        children: [
		          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: "", children: "\u2014" }),
		          props.options.map((option) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: option, children: option }, option))
		        ]
		      }
		    ),
		    props.hint === "" ? null : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { style: hintStyle, children: props.hint })
		  ] });
		}
		
		// client-src/card.tsx
		var import_jsx_runtime2 = require("react/jsx-runtime");
		function copyOf(t, key) {
		  const text = t(key);
		  return text === key ? "" : text;
		}
		function fieldControl(field, state, face) {
		  const draft = state.fields[field.field];
		  const common = {
		    id: `plugin-config-tavily-${field.field}`,
		    label: copyOf(face.t, `field.${field.field}`) || field.field,
		    hint: copyOf(face.t, `hint.${field.field}`),
		    overridden: draft?.overridden ?? false,
		    overriddenLabel: face.t("overridden"),
		    resetLabel: face.t("reset"),
		    disabled: !state.writable,
		    onReset: () => {
		      face.actions.resetField(field.field);
		    }
		  };
		  if (field.kind === "boolean") {
		    return /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
		      TavilyToggleField,
		      {
		        ...common,
		        checked: draft?.text === "true",
		        onToggle: (next) => {
		          face.actions.edit(field.field, String(next));
		        }
		      },
		      field.field
		    );
		  }
		  if (field.kind === "enum") {
		    return /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
		      TavilySelectField,
		      {
		        ...common,
		        value: draft?.text ?? "",
		        options: field.options ?? [],
		        onSelect: (next) => {
		          face.actions.edit(field.field, next);
		        }
		      },
		      field.field
		    );
		  }
		  return /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
		    import_dsh_client_ui_primitives.SettingsValueField,
		    {
		      ...common,
		      text: draft?.text ?? "",
		      invalid: draft?.invalid ?? false,
		      invalidLabel: face.t("invalidNumber"),
		      numeric: field.kind === "number",
		      onEdit: (text) => {
		        face.actions.edit(field.field, text);
		      }
		    },
		    field.field
		  );
		}
		function TavilyCard(props, face) {
		  const state = (0, import_react.useSyncExternalStore)(face.store.subscribe, face.store.getSnapshot);
		  if (props.view === "summary") return /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("p", { children: face.t("summary") });
		  return /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(import_dsh_client_ui_primitives.SettingsForm, { labels: face.labels, state, onSave: face.actions.save, onDiscard: face.actions.discard, children: face.fields.map((field) => fieldControl(field, state, face)) });
		}
		
		// client-src/controller.ts
		var import_dsh_client_ui_primitives3 = require("@deepseek-ai/dsh-client-ui-primitives");
		
		// client-src/fields.ts
		var import_dsh_client_ui_primitives2 = require("@deepseek-ai/dsh-client-ui-primitives");
		var TAVILY_FIELDS = [
		  { field: "apiKey", kind: "password" },
		  { field: "apiKeyEnv", kind: "text" },
		  { field: "baseURL", kind: "text" },
		  { field: "searchDepth", kind: "enum", options: ["ultra-fast", "fast", "basic", "advanced"] },
		  { field: "topic", kind: "enum", options: ["general", "news", "finance"] },
		  { field: "maxResults", kind: "number" },
		  { field: "chunksPerSource", kind: "number" },
		  { field: "autoParameters", kind: "boolean" },
		  { field: "timeRange", kind: "enum", options: ["day", "week", "month", "year"] },
		  { field: "days", kind: "number" },
		  { field: "startDate", kind: "text" },
		  { field: "endDate", kind: "text" },
		  { field: "includeAnswer", kind: "enum", options: ["true", "false", "basic", "advanced"] },
		  { field: "includeRawContent", kind: "enum", options: ["true", "false", "markdown", "text"] },
		  { field: "includeImages", kind: "boolean" },
		  { field: "includeImageDescriptions", kind: "boolean" },
		  { field: "includeFavicon", kind: "boolean" },
		  { field: "includeUsage", kind: "boolean" },
		  { field: "includeDomains", kind: "list" },
		  { field: "excludeDomains", kind: "list" },
		  { field: "exactMatch", kind: "boolean" },
		  { field: "language", kind: "text" },
		  { field: "filterByLanguage", kind: "boolean" },
		  { field: "country", kind: "text" }
		];
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
		
		// client-src/controller.ts
		var TAVILY_SETTINGS_NS = "web-search-tavily";
		var TAVILY_BUNDLE = "@junjiangao/dsh-web-search-tavily";
		var TAVILY_ROW_ID = "web-search-tavily";
		var TAVILY_ROW_CONFIG_KEY = `${TAVILY_BUNDLE}#${TAVILY_ROW_ID}`;
		var TavilyCardController = class {
		  form;
		  store;
		  /**
		   * @param scope - the bound configuration form for the `web-search-tavily` entry.
		   */
		  constructor(scope) {
		    this.form = new import_dsh_client_ui_primitives3.SettingsFormModel(scope, TAVILY_FIELDS.map((field) => specOf(field)));
		    this.store = this.form.bind(() => this.projection());
		  }
		  /**
		   * Build the face the card renders.
		   * @returns the snapshot store and the model's actions.
		   */
		  inject() {
		    return { store: this.store, actions: this.form.actions() };
		  }
		  /** Release the form's accepted-value subscription. */
		  dispose() {
		    this.form.dispose();
		  }
		  projection() {
		    const fields = {};
		    for (const field of TAVILY_FIELDS) fields[field.field] = this.form.field(field.field);
		    return { ...this.form.shell(), fields };
		  }
		};
		
		// client-src/locales.ts
		var NS = "webSearchTavily";
		var zh = {
		  title: "Tavily \u641C\u7D22",
		  summary: "\u901A\u8FC7 Tavily \u63D0\u4F9B\u7F51\u7EDC\u641C\u7D22\uFF1B\u672A\u914D\u7F6E\u5BC6\u94A5\u65F6\u8FDB\u5165\u65E0\u5BC6\u94A5\u6A21\u5F0F\u3002",
		  save: "\u4FDD\u5B58",
		  saving: "\u4FDD\u5B58\u4E2D\u2026",
		  readOnly: "\u5F53\u524D\u90E8\u7F72\u4EE5\u53EA\u8BFB\u65B9\u5F0F\u4FDD\u5B58\u914D\u7F6E\uFF0C\u4FEE\u6539\u4E0D\u4F1A\u5199\u5165\u3002",
		  unavailable: "\u8BE5\u63D2\u4EF6\u5F53\u524D\u672A\u7531 Host \u63D0\u4F9B\u914D\u7F6E\u3002",
		  saveFailed: "Host \u672A\u63A5\u53D7\u8FD9\u6B21\u4FDD\u5B58\uFF0C\u8349\u7A3F\u5DF2\u4FDD\u7559\u3002",
		  overridden: "\u5DF2\u8986\u76D6",
		  reset: "\u6062\u590D\u9ED8\u8BA4",
		  invalidNumber: "\u8BF7\u8F93\u5165\u6570\u5B57",
		  invalidValue: "\u8BF7\u9009\u62E9\u5217\u8868\u4E2D\u7684\u503C",
		  "field.apiKey": "\u5B57\u9762 API \u5BC6\u94A5",
		  "hint.apiKey": "\u76F4\u63A5\u5199\u5165\u914D\u7F6E\u6587\u4EF6\u7684\u5BC6\u94A5\uFF1B\u66F4\u63A8\u8350\u4E0B\u9762\u7528\u51ED\u636E\u5F15\u7528\u3002",
		  "field.apiKeyEnv": "\u51ED\u636E\u5F15\u7528 / \u73AF\u5883\u53D8\u91CF",
		  "hint.apiKeyEnv": "\u4FDD\u5B58\u5BC6\u94A5\u7684\u73AF\u5883\u53D8\u91CF\u540D\uFF0C\u9ED8\u8BA4 TAVILY_API_KEY\u3002",
		  "field.baseURL": "\u63A5\u53E3\u5730\u5740",
		  "hint.baseURL": "\u7559\u7A7A\u4F7F\u7528\u5B98\u65B9\u63A5\u53E3\uFF1B\u4E5F\u53EF\u7531 TAVILY_BASE_URL \u63D0\u4F9B\u3002",
		  "field.searchDepth": "\u68C0\u7D22\u6DF1\u5EA6",
		  "field.topic": "\u4E3B\u9898",
		  "field.maxResults": "\u7ED3\u679C\u6570\u91CF\u4E0A\u9650",
		  "hint.maxResults": "\u5355\u6B21\u68C0\u7D22\u8FD4\u56DE\u7684\u7ED3\u679C\u6761\u6570\u3002",
		  "field.chunksPerSource": "\u6BCF\u4E2A\u6765\u6E90\u7684\u5206\u5757\u6570",
		  "hint.chunksPerSource": "\u4EC5\u5728 advanced / fast \u6DF1\u5EA6\u4E0B\u751F\u6548\u3002",
		  "field.autoParameters": "\u81EA\u52A8\u53C2\u6570",
		  "field.timeRange": "\u65F6\u95F4\u8303\u56F4",
		  "field.days": "\u6700\u8FD1\u5929\u6570",
		  "hint.days": "\u4E0E\u65F6\u95F4\u8303\u56F4\u4E8C\u9009\u4E00\u3002",
		  "field.startDate": "\u5F00\u59CB\u65E5\u671F",
		  "hint.startDate": "\u683C\u5F0F YYYY-MM-DD\u3002",
		  "field.endDate": "\u7ED3\u675F\u65E5\u671F",
		  "hint.endDate": "\u683C\u5F0F YYYY-MM-DD\u3002",
		  "field.includeAnswer": "\u751F\u6210\u7B54\u6848",
		  "hint.includeAnswer": "true / false\uFF0C\u6216 basic / advanced\u3002",
		  "field.includeRawContent": "\u539F\u59CB\u5185\u5BB9",
		  "hint.includeRawContent": "true / false\uFF0C\u6216 markdown / text\u3002",
		  "field.includeImages": "\u56FE\u7247\u7ED3\u679C",
		  "field.includeImageDescriptions": "\u56FE\u7247\u63CF\u8FF0",
		  "field.includeFavicon": "\u7AD9\u70B9\u56FE\u6807",
		  "field.includeUsage": "\u7528\u91CF\u4FE1\u606F",
		  "field.includeDomains": "\u9650\u5B9A\u57DF\u540D",
		  "hint.includeDomains": "\u9017\u53F7\u5206\u9694\uFF0C\u4F8B\u5982 a.com, b.com\u3002",
		  "field.excludeDomains": "\u6392\u9664\u57DF\u540D",
		  "hint.excludeDomains": "\u9017\u53F7\u5206\u9694\uFF0C\u4F8B\u5982 a.com, b.com\u3002",
		  "field.exactMatch": "\u7CBE\u786E\u5339\u914D",
		  "field.language": "\u7ED3\u679C\u8BED\u8A00",
		  "field.filterByLanguage": "\u6309\u8BED\u8A00\u8FC7\u6EE4",
		  "field.country": "\u56FD\u5BB6\u504F\u597D"
		};
		var en = {
		  title: "Tavily search",
		  summary: "Serves web search through Tavily; runs keyless until a key is configured.",
		  save: "Save",
		  saving: "Saving\u2026",
		  readOnly: "This deployment stores settings read-only; edits are not written.",
		  unavailable: "The Host does not serve configuration for this plugin.",
		  saveFailed: "The Host refused this save; the drafts were kept.",
		  overridden: "Overridden",
		  reset: "Reset",
		  invalidNumber: "Enter a number",
		  invalidValue: "Choose a listed value",
		  "field.apiKey": "Literal API key",
		  "hint.apiKey": "A key written into the configuration file; prefer the credential reference below.",
		  "field.apiKeyEnv": "Credential reference / environment variable",
		  "hint.apiKeyEnv": "Environment variable holding the key; defaults to TAVILY_API_KEY.",
		  "field.baseURL": "Endpoint",
		  "hint.baseURL": "Blank uses the public endpoint; TAVILY_BASE_URL may supply it too.",
		  "field.searchDepth": "Search depth",
		  "field.topic": "Topic",
		  "field.maxResults": "Result limit",
		  "hint.maxResults": "Results one search returns.",
		  "field.chunksPerSource": "Chunks per source",
		  "hint.chunksPerSource": "Only used by the advanced and fast depths.",
		  "field.autoParameters": "Automatic parameters",
		  "field.timeRange": "Time range",
		  "field.days": "Days back",
		  "hint.days": "Alternative to the time range.",
		  "field.startDate": "Start date",
		  "hint.startDate": "Format YYYY-MM-DD.",
		  "field.endDate": "End date",
		  "hint.endDate": "Format YYYY-MM-DD.",
		  "field.includeAnswer": "Generated answer",
		  "hint.includeAnswer": "true / false, or basic / advanced.",
		  "field.includeRawContent": "Raw content",
		  "hint.includeRawContent": "true / false, or markdown / text.",
		  "field.includeImages": "Image results",
		  "field.includeImageDescriptions": "Image descriptions",
		  "field.includeFavicon": "Favicons",
		  "field.includeUsage": "Usage credits",
		  "field.includeDomains": "Include domains",
		  "hint.includeDomains": "Comma separated, e.g. a.com, b.com.",
		  "field.excludeDomains": "Exclude domains",
		  "hint.excludeDomains": "Comma separated, e.g. a.com, b.com.",
		  "field.exactMatch": "Exact match",
		  "field.language": "Result language",
		  "field.filterByLanguage": "Filter by language",
		  "field.country": "Country boost"
		};
		var dictionaries = { zh, en };
		
		// client-src/client.ts
		var inject = ["slots", "locale", "configForms"];
		function apply(ctx) {
		  const t = ctx.locale.bind(NS);
		  ctx.effect(() => ctx.locale.register(NS, dictionaries), "web-search-tavily: dictionaries");
		  const controller = new TavilyCardController(ctx.configForms.get(TAVILY_SETTINGS_NS));
		  ctx.effect(() => () => {
		    controller.dispose();
		  }, "web-search-tavily: form subscription");
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
		  ctx.effect(() => ctx.configForms.whileServed([TAVILY_SETTINGS_NS], () => {
		    const disposer = ctx.slots.inject("plugins.row.config", () => ctx.slots.register(
		      { name: "plugins.row.config", key: TAVILY_ROW_CONFIG_KEY },
		      (props) => TavilyCard(props, face)
		    ));
		    return typeof disposer === "function" ? disposer : () => {
		    };
		  }), "web-search-tavily: row configuration page");
		}
		
		return module.exports;
	}
});
