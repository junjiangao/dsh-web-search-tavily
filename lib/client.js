window.__ModuleLoader__.load({
	id: "@deepseek-ai/dsh-web-search-tavily",
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
		  for (var name2 in all)
		    __defProp(target, name2, { get: all[name2], enumerable: true });
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
		  SETTINGS_NAMESPACE: () => SETTINGS_NAMESPACE,
		  apply: () => apply,
		  inject: () => inject,
		  name: () => name
		});
		module.exports = __toCommonJS(client_exports);
		var import_react = require("react");
		
		// client-src/form.ts
		var import_client = require("@deepseek-ai/dsh-client-runtime/client");
		var EMPTY_TEXT = "";
		function displayOf(value) {
		  return value === void 0 || value === null ? EMPTY_TEXT : String(value);
		}
		function numberSpec(field) {
		  return {
		    kind: "text",
		    field,
		    format: displayOf,
		    parse: (text) => {
		      const trimmed = text.trim();
		      if (trimmed === "") return { clear: true };
		      const parsed = Number(trimmed);
		      return Number.isFinite(parsed) ? { set: parsed } : void 0;
		    }
		  };
		}
		function textSpec(field) {
		  return {
		    kind: "text",
		    field,
		    format: displayOf,
		    parse: (text) => text.trim() === "" ? { clear: true } : { set: text }
		  };
		}
		var FormModel = class {
		  scope;
		  specs;
		  staged = /* @__PURE__ */ new Map();
		  listeners = /* @__PURE__ */ new Set();
		  saving = false;
		  failed = false;
		  constructor(scope, specs) {
		    this.scope = scope;
		    this.specs = new Map(specs.map((spec) => [spec.field, spec]));
		    scope.subscribe(() => this.publish());
		  }
		  /** Build a store the card reads through a selector, republished on any change. */
		  bind(project) {
		    const store = (0, import_client.createSnapshotStore)(project());
		    this.listeners.add(() => {
		      store.set(project());
		    });
		    return store;
		  }
		  /** Card-level state: what the host serves and what a save would do. */
		  shell() {
		    const snapshot = this.scope.getSnapshot();
		    const plan = this.plan();
		    return {
		      available: snapshot.status === "ready",
		      writable: snapshot.writable,
		      dirty: plan.length > 0,
		      invalid: plan.some((item) => item.write === void 0),
		      saving: this.saving,
		      failed: this.failed
		    };
		  }
		  /** Text control state for ValueField rendering. */
		  textField(field) {
		    const staged = this.staged.get(field);
		    const spec = this.specOf(field);
		    if (spec.kind !== "text") throw new Error(`web-search-tavily: ${field} is not a text field`);
		    if (staged === void 0) {
		      return {
		        text: spec.format(this.sectionValue(field)),
		        overridden: this.stored(field),
		        invalid: false
		      };
		    }
		    if (staged.kind === "clear") return { text: EMPTY_TEXT, overridden: true, invalid: false };
		    const text = staged.value === void 0 ? EMPTY_TEXT : spec.format(staged.value);
		    const write = spec.parse(text);
		    return {
		      text,
		      overridden: write !== void 0 && !("clear" in write),
		      invalid: write === void 0
		    };
		  }
		  /** Secret control state for SecretField rendering. */
		  secretField(field) {
		    const staged = this.staged.get(field);
		    const value = this.sectionValue(field);
		    const configured = typeof value === "string" && value.length > 0;
		    if (staged === void 0 || staged.kind === "clear") {
		      return { text: EMPTY_TEXT, configured };
		    }
		    const text = typeof staged.value === "string" ? staged.value : EMPTY_TEXT;
		    return { text, configured: text.length > 0 };
		  }
		  /** Select control state: the effective option, or undefined when unset. */
		  selectField(field) {
		    const staged = this.staged.get(field);
		    if (staged !== void 0 && staged.kind === "set") {
		      return { value: staged.value, overridden: true };
		    }
		    return { value: this.sectionValue(field), overridden: this.stored(field) };
		  }
		  /** Checkbox control state. */
		  booleanField(field) {
		    const staged = this.staged.get(field);
		    if (staged !== void 0 && staged.kind === "set") {
		      return { checked: staged.value === true, overridden: true };
		    }
		    return { checked: this.sectionValue(field) === true, overridden: this.stored(field) };
		  }
		  /** The edit/reset/save/discard actions the card's slot entry injects. */
		  actions() {
		    return {
		      edit: (field, text) => {
		        this.stage(field, { kind: "set", value: text });
		      },
		      choose: (field, value, clear) => {
		        this.stage(field, clear ? { kind: "clear" } : { kind: "set", value });
		      },
		      toggle: (field, checked, defaultValue) => {
		        this.stage(field, checked === defaultValue ? { kind: "clear" } : { kind: "set", value: checked });
		      },
		      resetField: (field) => {
		        this.stage(field, { kind: "clear" });
		      },
		      /**
		       * Stage a batch of recommended values at once. Every value lands in the
		       * staged map (the save plan skips ones identical to the section value),
		       * so the user sees the full diff before committing.
		       */
		      applyRecommended: (values) => {
		        for (const [field, value] of Object.entries(values)) {
		          this.stage(field, { kind: "set", value });
		        }
		      },
		      save: () => {
		        void this.save();
		      },
		      discard: () => {
		        if (this.staged.size === 0 && !this.failed) return;
		        this.staged.clear();
		        this.failed = false;
		        this.publish();
		      }
		    };
		  }
		  stage(field, edit) {
		    this.staged.set(field, edit);
		    this.failed = false;
		    this.publish();
		  }
		  /** Write every staged edit, then re-read what the host accepted. */
		  async save() {
		    const plan = this.plan();
		    const writes = plan.flatMap((item) => item.write === void 0 ? [] : [item.write]);
		    if (plan.length === 0 || this.saving || writes.length !== plan.length) return;
		    this.saving = true;
		    this.failed = false;
		    this.publish();
		    let landed = true;
		    for (const write of writes) landed = await write() && landed;
		    if (landed) this.staged.clear();
		    this.saving = false;
		    this.failed = !landed;
		    this.publish();
		  }
		  /** Every staged edit a save would write; an invalid draft carries no write. */
		  plan() {
		    const plan = [];
		    for (const [field, staged] of this.staged) {
		      const spec = this.specOf(field);
		      if (spec.kind === "secret") {
		        const value = staged.kind === "set" && typeof staged.value === "string" ? staged.value.trim() : EMPTY_TEXT;
		        if (value !== "") plan.push({ field, write: () => this.store(field, value) });
		        continue;
		      }
		      if (spec.kind === "select" || spec.kind === "boolean") {
		        if (staged.kind === "clear") {
		          if (this.stored(field)) plan.push({ field, write: () => this.clear(field) });
		          continue;
		        }
		        if (staged.value === this.sectionValue(field)) continue;
		        plan.push({ field, write: () => this.store(field, staged.value) });
		        continue;
		      }
		      if (staged.kind === "clear") {
		        if (this.stored(field)) plan.push({ field, write: () => this.clear(field) });
		        continue;
		      }
		      const text = staged.value === void 0 ? EMPTY_TEXT : spec.format(staged.value);
		      if (text === spec.format(this.sectionValue(field))) continue;
		      const write = spec.parse(text);
		      if (write === void 0) {
		        plan.push({ field });
		      } else if ("clear" in write) {
		        plan.push({ field, write: () => this.clear(field) });
		      } else {
		        plan.push({ field, write: () => this.store(field, write.set) });
		      }
		    }
		    return plan;
		  }
		  async store(field, value) {
		    await this.scope.set(field, value);
		    return this.userLayer()?.[field] === value;
		  }
		  async clear(field) {
		    await this.scope.unset(field);
		    return !this.stored(field);
		  }
		  publish() {
		    for (const listener of this.listeners) listener();
		  }
		  specOf(field) {
		    const spec = this.specs.get(field);
		    if (spec === void 0) throw new Error(`web-search-tavily: no field ${field}`);
		    return spec;
		  }
		  snapshot() {
		    return this.scope.getSnapshot();
		  }
		  sectionValue(field) {
		    return this.snapshot().value?.[field];
		  }
		  userLayer() {
		    return this.snapshot().user;
		  }
		  stored(field) {
		    const user = this.userLayer();
		    return user !== void 0 && user !== null && field in user;
		  }
		};
		
		// client-src/locales.ts
		var LOCALE_NS = "web-search-tavily";
		var zh = {
		  title: "Tavily \u641C\u7D22",
		  description: "Tavily \u641C\u7D22\u63D0\u4F9B\u5546\uFF08keyless \u6A21\u5F0F\u6216 API \u5BC6\u94A5\uFF09\u3002",
		  expand: "\u663E\u793A\u8BBE\u7F6E",
		  collapse: "\u9690\u85CF\u8BBE\u7F6E",
		  recommend: "\u4F7F\u7528\u63A8\u8350\u914D\u7F6E",
		  recommendHint: "\u586B\u5165\u63A8\u8350\u7684\u5E38\u7528\u914D\u7F6E\uFF08\u68C0\u7D22\u6DF1\u5EA6 advanced\u3001\u7ED3\u679C\u6570 8\u3001\u751F\u6210\u56DE\u7B54\u3001\u5305\u542B\u539F\u6587\u4E0E\u56FE\u6807\uFF09\uFF0C\u786E\u8BA4\u540E\u4FDD\u5B58\u3002",
		  apiKey: "API \u5BC6\u94A5",
		  apiKeyHint: "\u7559\u7A7A\u5219\u4F7F\u7528 TAVILY_API_KEY \u73AF\u5883\u53D8\u91CF\u6216\u5BC6\u94A5\u5E93\u4E2D\u7684\u51ED\u636E\u3002",
		  apiKeySet: "\u5DF2\u914D\u7F6E\u5BC6\u94A5\u3002",
		  apiKeyUnset: "\u672A\u914D\u7F6E\u5BC6\u94A5\uFF08keyless \u6A21\u5F0F\uFF09\u3002",
		  apiKeyEnv: "\u5BC6\u94A5\u73AF\u5883\u53D8\u91CF",
		  apiKeyEnvHint: "\u51ED\u636E\u5F15\u7528\uFF1B\u9ED8\u8BA4\u4E3A TAVILY_API_KEY\u3002",
		  baseURL: "\u63A5\u53E3\u5730\u5740",
		  baseURLHint: "\u9ED8\u8BA4\u4F7F\u7528 Tavily \u516C\u5171 API\uFF1B\u53EF\u901A\u8FC7 TAVILY_BASE_URL \u8986\u76D6\u3002",
		  searchDepth: "\u68C0\u7D22\u6DF1\u5EA6",
		  searchDepthHint: "basic \u9002\u5408\u5E38\u89C4\u68C0\u7D22\uFF0Cadvanced \u8FD4\u56DE\u66F4\u5168\u7684\u5185\u5BB9\u3002",
		  topic: "\u4E3B\u9898",
		  topicHint: "\u6309\u4E3B\u9898\u8FC7\u6EE4\u7ED3\u679C\uFF08general/news/finance\uFF09\u3002",
		  maxResults: "\u7ED3\u679C\u6570\u91CF",
		  maxResultsHint: "\u5355\u6B21\u641C\u7D22\u9ED8\u8BA4\u8FD4\u56DE\u7684\u7ED3\u679C\u6761\u6570\u3002",
		  includeAnswer: "\u751F\u6210\u56DE\u7B54",
		  includeAnswerHint: "\u8BF7\u6C42 Tavily \u57FA\u4E8E\u7ED3\u679C\u751F\u6210\u4E00\u6BB5\u56DE\u7B54\u3002",
		  includeImages: "\u5305\u542B\u56FE\u7247",
		  includeImagesHint: "\u8FD4\u56DE\u56FE\u7247\u7ED3\u679C\u3002",
		  includeRawContent: "\u5305\u542B\u539F\u6587",
		  includeRawContentHint: "\u8FD4\u56DE\u7ED3\u679C\u7684\u539F\u59CB\u9875\u9762\u5185\u5BB9\u3002",
		  includeFavicon: "\u5305\u542B\u56FE\u6807",
		  includeFaviconHint: "\u8FD4\u56DE\u7ED3\u679C\u7AD9\u70B9\u7684 favicon \u5730\u5740\u3002",
		  includeUsage: "\u5305\u542B\u7528\u91CF",
		  includeUsageHint: "\u8FD4\u56DE\u672C\u6B21\u641C\u7D22\u7684\u989D\u5EA6\u6D88\u8017\u4FE1\u606F\u3002",
		  overridden: "\u5DF2\u8986\u76D6",
		  reset: "\u6062\u590D\u9ED8\u8BA4",
		  invalidNumber: "\u8BF7\u8F93\u5165\u6570\u5B57\uFF0C\u6216\u7559\u7A7A\u4F7F\u7528\u9ED8\u8BA4\u503C\u3002",
		  readOnly: "\u5F53\u524D\u90E8\u7F72\u4EE5\u53EA\u8BFB\u65B9\u5F0F\u5B58\u50A8\u8BBE\u7F6E\u3002",
		  save: "\u4FDD\u5B58",
		  saving: "\u4FDD\u5B58\u4E2D\u2026",
		  discard: "\u653E\u5F03",
		  unsaved: "\u672A\u4FDD\u5B58",
		  saveFailed: "\u90E8\u7F72\u672A\u63A5\u53D7\u8FD9\u4E9B\u503C\uFF1B\u5DF2\u4FDD\u7559\u5F85\u60A8\u66F4\u6B63\u3002"
		};
		var en = {
		  title: "Tavily Search",
		  description: "The Tavily search provider (keyless mode or API key).",
		  expand: "Show settings",
		  collapse: "Hide settings",
		  recommend: "Apply recommended settings",
		  recommendHint: "Stages the recommended routine configuration (search depth advanced, 8 results, generated answer, raw content and favicons); review and save.",
		  apiKey: "API key",
		  apiKeyHint: "Leave blank to use the TAVILY_API_KEY environment variable or credential store.",
		  apiKeySet: "A key is configured.",
		  apiKeyUnset: "No key configured (keyless mode).",
		  apiKeyEnv: "Key environment variable",
		  apiKeyEnvHint: "Credential reference; defaults to TAVILY_API_KEY.",
		  baseURL: "Endpoint",
		  baseURLHint: "Defaults to the Tavily public API; overridable via TAVILY_BASE_URL.",
		  searchDepth: "Search depth",
		  searchDepthHint: "basic for routine retrieval, advanced for fuller content.",
		  topic: "Topic",
		  topicHint: "Filter results to a topic (general/news/finance).",
		  maxResults: "Result count",
		  maxResultsHint: "Default number of results one search returns.",
		  includeAnswer: "Include answer",
		  includeAnswerHint: "Ask Tavily for a generated answer over the results.",
		  includeImages: "Include images",
		  includeImagesHint: "Return image results.",
		  includeRawContent: "Include raw content",
		  includeRawContentHint: "Return raw page content of the results.",
		  includeFavicon: "Include favicons",
		  includeFaviconHint: "Return favicon URLs of the result sites.",
		  includeUsage: "Include usage",
		  includeUsageHint: "Return credit-usage information for this search.",
		  overridden: "Overridden",
		  reset: "Reset to default",
		  invalidNumber: "Enter a number, or leave blank to use the default.",
		  readOnly: "This deployment stores settings read-only.",
		  save: "Save",
		  saving: "Saving\u2026",
		  discard: "Discard",
		  unsaved: "Unsaved",
		  saveFailed: "The deployment did not accept these values; they were left for you to correct."
		};
		
		// client-src/client.ts
		var name = "web-search-tavily";
		var SETTINGS_NAMESPACE = "web-search-tavily";
		var inject = ["slots", "locale", "settingsScope"];
		var SEARCH_DEPTHS = ["ultra-fast", "fast", "basic", "advanced"];
		var TOPICS = ["general", "news", "finance"];
		var FORM_FIELDS = [
		  { kind: "secret", field: "apiKey" },
		  textSpec("apiKeyEnv"),
		  textSpec("baseURL"),
		  numberSpec("maxResults"),
		  { kind: "select", field: "searchDepth" },
		  { kind: "select", field: "topic" },
		  { kind: "boolean", field: "includeAnswer" },
		  { kind: "boolean", field: "includeImages" },
		  { kind: "boolean", field: "includeRawContent" },
		  { kind: "boolean", field: "includeFavicon" },
		  { kind: "boolean", field: "includeUsage" }
		];
		var RECOMMENDED_CONFIG = {
		  searchDepth: "advanced",
		  maxResults: 8,
		  includeAnswer: true,
		  includeRawContent: true,
		  includeFavicon: true,
		  includeUsage: false
		};
		var TavilyCardController = class {
		  form;
		  store;
		  constructor(scope) {
		    this.form = new FormModel(scope, FORM_FIELDS);
		    this.store = this.form.bind(() => this.projection());
		  }
		  projection() {
		    return {
		      shell: this.form.shell(),
		      apiKey: this.form.secretField("apiKey"),
		      apiKeyEnv: this.form.textField("apiKeyEnv"),
		      baseURL: this.form.textField("baseURL"),
		      maxResults: this.form.textField("maxResults"),
		      searchDepth: { ...this.form.selectField("searchDepth"), options: [...SEARCH_DEPTHS] },
		      topic: { ...this.form.selectField("topic"), options: [...TOPICS] },
		      includeAnswer: this.form.booleanField("includeAnswer"),
		      includeImages: this.form.booleanField("includeImages"),
		      includeRawContent: this.form.booleanField("includeRawContent"),
		      includeFavicon: this.form.booleanField("includeFavicon"),
		      includeUsage: this.form.booleanField("includeUsage")
		    };
		  }
		  /** The face the card's slot registration injects. */
		  inject() {
		    return {
		      hooks: { tavilyCard: this.store },
		      ...this.form.actions()
		    };
		  }
		};
		var cardStyle = {
		  display: "flex",
		  flexDirection: "column",
		  gap: "14px",
		  padding: "16px",
		  borderRadius: "16px",
		  border: "1px solid var(--dsw-alias-border-l2, rgba(128,128,128,.25))",
		  background: "var(--dsw-alias-surface-l2, transparent)"
		};
		var cardHeaderStyle = {
		  display: "flex",
		  flexDirection: "column",
		  gap: "2px"
		};
		var cardTitleRowStyle = {
		  display: "flex",
		  alignItems: "center",
		  gap: "10px"
		};
		var cardTitleStyle = {
		  fontSize: "15px",
		  fontWeight: "600",
		  color: "var(--dsw-alias-label-primary, inherit)"
		};
		var toggleButtonStyle = {
		  border: "none",
		  background: "transparent",
		  color: "var(--dsw-alias-accent, #3b82f6)",
		  fontSize: "12px",
		  cursor: "pointer",
		  padding: "2px 4px"
		};
		var cardDescriptionStyle = {
		  fontSize: "13px",
		  color: "var(--dsw-alias-label-tertiary, rgba(128,128,128,.8))"
		};
		var rowStyle = {
		  padding: "4px 0"
		};
		var labelStyle = {
		  display: "flex",
		  alignItems: "center",
		  gap: "8px",
		  fontSize: "13px",
		  fontWeight: "500",
		  marginBottom: "4px",
		  color: "var(--dsw-alias-label-primary, inherit)"
		};
		var checkboxLabelStyle = {
		  display: "flex",
		  alignItems: "center",
		  gap: "8px",
		  fontSize: "13px",
		  fontWeight: "500",
		  cursor: "pointer",
		  color: "var(--dsw-alias-label-primary, inherit)"
		};
		var badgeStyle = {
		  fontSize: "11px",
		  padding: "1px 6px",
		  borderRadius: "6px",
		  background: "var(--dsw-alias-fill-l2, rgba(128,128,128,.15))",
		  color: "var(--dsw-alias-label-secondary, inherit)"
		};
		var hintStyle = {
		  fontSize: "12px",
		  color: "var(--dsw-alias-label-tertiary, rgba(128,128,128,.8))",
		  margin: "4px 0 0"
		};
		var inputStyle = {
		  width: "100%",
		  boxSizing: "border-box",
		  padding: "6px 10px",
		  borderRadius: "8px",
		  border: "1px solid var(--dsw-alias-border-l2, rgba(128,128,128,.3))",
		  background: "var(--dsw-alias-input-fill, transparent)",
		  color: "var(--dsw-alias-label-primary, inherit)",
		  fontSize: "13px",
		  fontFamily: "inherit"
		};
		var inputInvalidStyle = {
		  ...inputStyle,
		  borderColor: "var(--dsw-alias-danger, #e5484d)"
		};
		var selectStyle = {
		  ...inputStyle,
		  width: "100%"
		};
		var inputErrorStyle = {
		  fontSize: "12px",
		  color: "var(--dsw-alias-danger, #e5484d)",
		  margin: "4px 0 0"
		};
		var resetButtonStyle = {
		  border: "none",
		  background: "transparent",
		  color: "var(--dsw-alias-label-secondary, rgba(128,128,128,.8))",
		  fontSize: "12px",
		  cursor: "pointer",
		  padding: "0 4px",
		  textDecoration: "underline"
		};
		var footerStyle = {
		  display: "flex",
		  alignItems: "center",
		  gap: "10px",
		  paddingTop: "4px",
		  borderTop: "1px solid var(--dsw-alias-border-l2, rgba(128,128,128,.15))"
		};
		var statusStyle = {
		  fontSize: "12px",
		  color: "var(--dsw-alias-label-tertiary, rgba(128,128,128,.8))",
		  marginRight: "auto"
		};
		var buttonStyle = {
		  padding: "6px 14px",
		  borderRadius: "8px",
		  border: "1px solid var(--dsw-alias-border-l2, rgba(128,128,128,.3))",
		  background: "var(--dsw-alias-button-elevated-fill, transparent)",
		  color: "var(--dsw-alias-label-primary, inherit)",
		  fontSize: "13px",
		  cursor: "pointer"
		};
		var buttonPrimaryStyle = {
		  ...buttonStyle,
		  borderColor: "transparent",
		  background: "var(--dsw-alias-accent, #3b82f6)",
		  color: "var(--dsw-alias-label-on-accent, #fff)"
		};
		var buttonDisabledStyle = {
		  opacity: 0.5,
		  cursor: "default"
		};
		function CardShell(props) {
		  const { t, title, description, state, onApplyRecommended, onSave, onDiscard, children } = props;
		  const [expanded, setExpanded] = (0, import_react.useState)(false);
		  const saveDisabled = !state.dirty || state.invalid || state.saving || !state.writable;
		  const discardDisabled = !state.dirty && !state.failed || state.saving;
		  return (0, import_react.createElement)(
		    "div",
		    { style: cardStyle },
		    (0, import_react.createElement)(
		      "div",
		      { style: cardHeaderStyle },
		      (0, import_react.createElement)(
		        "div",
		        { style: cardTitleRowStyle },
		        (0, import_react.createElement)("span", { style: cardTitleStyle }, title),
		        (0, import_react.createElement)("button", {
		          type: "button",
		          style: toggleButtonStyle,
		          "aria-expanded": expanded,
		          onClick: () => {
		            setExpanded(!expanded);
		          }
		        }, expanded ? t("collapse") : t("expand"))
		      ),
		      (0, import_react.createElement)("div", { style: cardDescriptionStyle }, description)
		    ),
		    expanded ? [
		      ...children,
		      (0, import_react.createElement)(
		        "div",
		        { style: footerStyle },
		        state.failed ? (0, import_react.createElement)("span", { style: statusStyle }, t("saveFailed")) : state.dirty ? (0, import_react.createElement)("span", { style: statusStyle }, t("unsaved")) : (0, import_react.createElement)("span", { style: statusStyle }, ""),
		        (0, import_react.createElement)("button", {
		          type: "button",
		          style: buttonStyle,
		          onClick: onApplyRecommended
		        }, t("recommend")),
		        (0, import_react.createElement)("button", {
		          type: "button",
		          style: { ...buttonStyle, ...discardDisabled ? buttonDisabledStyle : {} },
		          disabled: discardDisabled,
		          onClick: onDiscard
		        }, t("discard")),
		        (0, import_react.createElement)("button", {
		          type: "button",
		          style: { ...buttonPrimaryStyle, ...saveDisabled ? buttonDisabledStyle : {} },
		          disabled: saveDisabled,
		          onClick: onSave
		        }, state.saving ? t("saving") : t("save"))
		      )
		    ] : null
		  );
		}
		function TextRow(props) {
		  const { id, label, hint, numeric, disabled, text, overridden, invalid, t, onEdit, onReset } = props;
		  return (0, import_react.createElement)(
		    "div",
		    { style: rowStyle },
		    (0, import_react.createElement)(
		      "label",
		      { htmlFor: id, style: labelStyle },
		      label,
		      overridden ? (0, import_react.createElement)("span", { style: badgeStyle }, t("overridden")) : null
		    ),
		    (0, import_react.createElement)("input", {
		      id,
		      type: numeric ? "number" : "text",
		      disabled,
		      value: text,
		      onChange: (event) => onEdit(event.target.value),
		      style: invalid ? inputInvalidStyle : inputStyle,
		      "aria-invalid": invalid
		    }),
		    invalid ? (0, import_react.createElement)("p", { style: inputErrorStyle }, t("invalidNumber")) : null,
		    hint === "" ? null : (0, import_react.createElement)("p", { style: hintStyle }, hint),
		    overridden ? (0, import_react.createElement)("button", { type: "button", style: resetButtonStyle, onClick: onReset }, t("reset")) : null
		  );
		}
		function SecretRow(props) {
		  const { id, label, hint, disabled, text, configured, stateLabel, onEdit } = props;
		  return (0, import_react.createElement)(
		    "div",
		    { style: rowStyle },
		    (0, import_react.createElement)(
		      "label",
		      { htmlFor: id, style: labelStyle },
		      label,
		      (0, import_react.createElement)("span", { style: badgeStyle }, stateLabel)
		    ),
		    (0, import_react.createElement)("input", {
		      id,
		      type: "password",
		      disabled,
		      placeholder: configured ? "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022" : "",
		      value: text,
		      onChange: (event) => onEdit(event.target.value),
		      style: inputStyle,
		      autoComplete: "off"
		    }),
		    hint === "" ? null : (0, import_react.createElement)("p", { style: hintStyle }, hint)
		  );
		}
		function SelectRow(props) {
		  const { id, label, hint, disabled, value, options, overridden, t, onChange } = props;
		  return (0, import_react.createElement)(
		    "div",
		    { style: rowStyle },
		    (0, import_react.createElement)(
		      "label",
		      { htmlFor: id, style: labelStyle },
		      label,
		      overridden ? (0, import_react.createElement)("span", { style: badgeStyle }, t("overridden")) : null
		    ),
		    (0, import_react.createElement)(
		      "select",
		      {
		        id,
		        disabled,
		        value: typeof value === "string" ? value : "",
		        onChange: (event) => onChange(event.target.value),
		        style: selectStyle
		      },
		      (0, import_react.createElement)("option", { value: "" }, ""),
		      ...options.map((option) => (0, import_react.createElement)("option", { key: option, value: option }, option))
		    ),
		    hint === "" ? null : (0, import_react.createElement)("p", { style: hintStyle }, hint)
		  );
		}
		function BooleanRow(props) {
		  const { id, label, hint, disabled, checked, overridden, t, onChange } = props;
		  return (0, import_react.createElement)(
		    "div",
		    { style: rowStyle },
		    (0, import_react.createElement)(
		      "label",
		      { htmlFor: id, style: checkboxLabelStyle },
		      (0, import_react.createElement)("input", {
		        id,
		        type: "checkbox",
		        disabled,
		        checked,
		        onChange: (event) => onChange(event.target.checked)
		      }),
		      (0, import_react.createElement)("span", null, label),
		      overridden ? (0, import_react.createElement)("span", { style: badgeStyle }, t("overridden")) : null
		    ),
		    hint === "" ? null : (0, import_react.createElement)("p", { style: hintStyle }, hint)
		  );
		}
		function TavilyCard(props) {
		  const { t } = props;
		  const state = props.useTavilyCard((snapshot) => snapshot);
		  const disabled = !state.shell.writable;
		  const shellState = state.shell;
		  return (0, import_react.createElement)(CardShell, {
		    t,
		    title: t("title"),
		    description: t("description"),
		    state: shellState,
		    onApplyRecommended: () => {
		      props.applyRecommended(RECOMMENDED_CONFIG);
		    },
		    onSave: props.save,
		    onDiscard: props.discard,
		    children: [
		      (0, import_react.createElement)(SecretRow, {
		        id: "plugin-config-tavily-key",
		        label: t("apiKey"),
		        hint: t("apiKeyHint"),
		        disabled,
		        text: state.apiKey.text,
		        configured: state.apiKey.configured,
		        stateLabel: t(state.apiKey.configured ? "apiKeySet" : "apiKeyUnset"),
		        onEdit: (text) => {
		          props.edit("apiKey", text);
		        }
		      }),
		      (0, import_react.createElement)(TextRow, {
		        id: "plugin-config-tavily-env",
		        label: t("apiKeyEnv"),
		        hint: t("apiKeyEnvHint"),
		        numeric: false,
		        disabled,
		        text: state.apiKeyEnv.text,
		        overridden: state.apiKeyEnv.overridden,
		        invalid: state.apiKeyEnv.invalid,
		        t,
		        onEdit: (text) => {
		          props.edit("apiKeyEnv", text);
		        },
		        onReset: () => {
		          props.resetField("apiKeyEnv");
		        }
		      }),
		      (0, import_react.createElement)(TextRow, {
		        id: "plugin-config-tavily-base-url",
		        label: t("baseURL"),
		        hint: t("baseURLHint"),
		        numeric: false,
		        disabled,
		        text: state.baseURL.text,
		        overridden: state.baseURL.overridden,
		        invalid: state.baseURL.invalid,
		        t,
		        onEdit: (text) => {
		          props.edit("baseURL", text);
		        },
		        onReset: () => {
		          props.resetField("baseURL");
		        }
		      }),
		      (0, import_react.createElement)(TextRow, {
		        id: "plugin-config-tavily-max-results",
		        label: t("maxResults"),
		        hint: t("maxResultsHint"),
		        numeric: true,
		        disabled,
		        text: state.maxResults.text,
		        overridden: state.maxResults.overridden,
		        invalid: state.maxResults.invalid,
		        t,
		        onEdit: (text) => {
		          props.edit("maxResults", text);
		        },
		        onReset: () => {
		          props.resetField("maxResults");
		        }
		      }),
		      (0, import_react.createElement)(SelectRow, {
		        id: "plugin-config-tavily-depth",
		        label: t("searchDepth"),
		        hint: t("searchDepthHint"),
		        disabled,
		        value: state.searchDepth.value,
		        options: state.searchDepth.options,
		        overridden: state.searchDepth.overridden,
		        t,
		        onChange: (value) => {
		          props.choose("searchDepth", value, value === "");
		        }
		      }),
		      (0, import_react.createElement)(SelectRow, {
		        id: "plugin-config-tavily-topic",
		        label: t("topic"),
		        hint: t("topicHint"),
		        disabled,
		        value: state.topic.value,
		        options: state.topic.options,
		        overridden: state.topic.overridden,
		        t,
		        onChange: (value) => {
		          props.choose("topic", value, value === "");
		        }
		      }),
		      (0, import_react.createElement)(BooleanRow, {
		        id: "plugin-config-tavily-answer",
		        label: t("includeAnswer"),
		        hint: t("includeAnswerHint"),
		        disabled,
		        checked: state.includeAnswer.checked,
		        overridden: state.includeAnswer.overridden,
		        t,
		        onChange: (checked) => {
		          props.toggle("includeAnswer", checked, false);
		        }
		      }),
		      (0, import_react.createElement)(BooleanRow, {
		        id: "plugin-config-tavily-images",
		        label: t("includeImages"),
		        hint: t("includeImagesHint"),
		        disabled,
		        checked: state.includeImages.checked,
		        overridden: state.includeImages.overridden,
		        t,
		        onChange: (checked) => {
		          props.toggle("includeImages", checked, false);
		        }
		      }),
		      (0, import_react.createElement)(BooleanRow, {
		        id: "plugin-config-tavily-raw",
		        label: t("includeRawContent"),
		        hint: t("includeRawContentHint"),
		        disabled,
		        checked: state.includeRawContent.checked,
		        overridden: state.includeRawContent.overridden,
		        t,
		        onChange: (checked) => {
		          props.toggle("includeRawContent", checked, false);
		        }
		      }),
		      (0, import_react.createElement)(BooleanRow, {
		        id: "plugin-config-tavily-favicon",
		        label: t("includeFavicon"),
		        hint: t("includeFaviconHint"),
		        disabled,
		        checked: state.includeFavicon.checked,
		        overridden: state.includeFavicon.overridden,
		        t,
		        onChange: (checked) => {
		          props.toggle("includeFavicon", checked, false);
		        }
		      }),
		      (0, import_react.createElement)(BooleanRow, {
		        id: "plugin-config-tavily-usage",
		        label: t("includeUsage"),
		        hint: t("includeUsageHint"),
		        disabled,
		        checked: state.includeUsage.checked,
		        overridden: state.includeUsage.overridden,
		        t,
		        onChange: (checked) => {
		          props.toggle("includeUsage", checked, false);
		        }
		      })
		    ]
		  });
		}
		function apply(ctx) {
		  ctx.locale.register(LOCALE_NS, { zh, en });
		  const controller = new TavilyCardController(ctx.settingsScope.bind({ namespace: SETTINGS_NAMESPACE }));
		  ctx.slots.inject("settings.plugin.item", function* () {
		    yield ctx.slots.register({
		      name: "settings.plugin.item",
		      key: SETTINGS_NAMESPACE,
		      locale: LOCALE_NS,
		      inject: () => controller.inject()
		    }, TavilyCard);
		  });
		}
		
		return module.exports;
	}
});
