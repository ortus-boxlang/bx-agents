/* BxAgents homepage behaviour. Every hook is a bxa- class or an id on the homepage only. */
(function () {
	"use strict";
	var D = window.BXA_DATA || {};
	var STARTERS = D.starters || {};
	var TRANSCRIPT = D.transcript || [];
	var home = document.querySelector(".bxa-home");
	if (!home) { return; }
	var BASE = home.getAttribute("data-base") || "/";
	var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
	var SIGNAL = "M12 0q-.934 0-1.83.139l.17 1.111a11 11 0 0 1 3.32 0l.172-1.111A12 12 0 0 0 12 0M9.152.34A12 12 0 0 0 5.77 1.742l.584.961a10.8 10.8 0 0 1 3.066-1.27zm5.696 0-.268 1.094a10.8 10.8 0 0 1 3.066 1.27l.584-.962A12 12 0 0 0 14.848.34M12 2.25a9.75 9.75 0 0 0-8.539 14.459c.074.134.1.292.064.441l-1.013 4.338 4.338-1.013a.62.62 0 0 1 .441.064A9.7 9.7 0 0 0 12 21.75c5.385 0 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25m-7.092.068a12 12 0 0 0-2.59 2.59l.909.664a11 11 0 0 1 2.345-2.345zm14.184 0-.664.909a11 11 0 0 1 2.345 2.345l.909-.664a12 12 0 0 0-2.59-2.59M1.742 5.77A12 12 0 0 0 .34 9.152l1.094.268a10.8 10.8 0 0 1 1.269-3.066zm20.516 0-.961.584a10.8 10.8 0 0 1 1.27 3.066l1.093-.268a12 12 0 0 0-1.402-3.383M.138 10.168A12 12 0 0 0 0 12q0 .934.139 1.83l1.111-.17A11 11 0 0 1 1.125 12q0-.848.125-1.66zm23.723.002-1.111.17q.125.812.125 1.66c0 .848-.042 1.12-.125 1.66l1.111.172a12.1 12.1 0 0 0 0-3.662M1.434 14.58l-1.094.268a12 12 0 0 0 .96 2.591l-.265 1.14 1.096.255.36-1.539-.188-.365a10.8 10.8 0 0 1-.87-2.35m21.133 0a10.8 10.8 0 0 1-1.27 3.067l.962.584a12 12 0 0 0 1.402-3.383zm-1.793 3.848a11 11 0 0 1-2.345 2.345l.664.909a12 12 0 0 0 2.59-2.59zm-19.959 1.1L.357 21.48a1.8 1.8 0 0 0 2.162 2.161l1.954-.455-.256-1.095-1.953.455a.675.675 0 0 1-.81-.81l.454-1.954zm16.832 1.769a10.8 10.8 0 0 1-3.066 1.27l.268 1.093a12 12 0 0 0 3.382-1.402zm-10.94.213-1.54.36.256 1.095 1.139-.266c.814.415 1.683.74 2.591.961l.268-1.094a10.8 10.8 0 0 1-2.35-.869zm3.634 1.24-.172 1.111a12.1 12.1 0 0 0 3.662 0l-.17-1.111q-.812.125-1.66.125a11 11 0 0 1-1.66-.125";

	function $(s, c) { return (c || document).querySelector(s); }
	function $$(s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); }
	function esc(t) { return String(t).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }
	function ico(name) {
		if (name === "signal") { return '<svg class="ph-duotone bxa-sig" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="' + SIGNAL + '"/></svg>'; }
		return '<i class="ph-duotone ph-' + name + '"></i>';
	}

	/* copy buttons */
	function wireCopy(b, get) {
		b.addEventListener("click", function () {
			var t = get();
			function done() { var o = b.textContent; b.textContent = "Copied"; b.classList.add("bxa-ok"); setTimeout(function () { b.textContent = o; b.classList.remove("bxa-ok"); }, 1400); }
			try { navigator.clipboard.writeText(t).then(done, function () { done(); }); } catch (e) { done(); }
		});
	}
	$$(".bxa-copy[data-copy]").forEach(function (b) { wireCopy(b, function () { return b.getAttribute("data-copy"); }); });

	/* pointer glow on cards */
	document.addEventListener("pointermove", function (e) {
		var c = e.target.closest && e.target.closest(".bxa-gc");
		if (!c) { return; }
		var r = c.getBoundingClientRect();
		c.style.setProperty("--mx", (e.clientX - r.left) + "px");
		c.style.setProperty("--my", (e.clientY - r.top) + "px");
	});

	/* hero stage tilt */
	var stage = $("#stage");
	if (stage && !reduce && window.matchMedia("(hover: hover)").matches) {
		stage.addEventListener("pointermove", function (e) {
			var r = stage.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
			stage.style.transform = "rotateY(" + (x * 5) + "deg) rotateX(" + (-y * 5) + "deg)";
		});
		stage.addEventListener("pointerleave", function () { stage.style.transform = ""; });
	}

	/* hero: folder -> generated output */
	var T = {
		agent: { k: "The agent", h: "Agent.yaml is the agent", p: "A name, a model and any settings you need, in plain YAML. Need code? Use a class-based Agent.bx instead.", g: [["agent/GeneratedAgentFactory.bx", "builds your agent"]] },
		instructions: { k: "The system prompt", h: "instructions.md", p: "Optional. Set instructions in the class, or drop the file in and let the build wire it in.", g: [["wired in at build", "read once, not per request"]] },
		tools: { k: "Tools", h: "Functions become tools", p: "Any class with an @AITool annotated function is callable by the agent, with no registration step.", g: [["tools/", "every @AITool discovered"]] },
		skills: { k: "Skills", h: "Model-selected guidance", p: "A SKILL.md folder is offered to the model on demand. It is separate from the always-on instructions.", g: [["skills/", "one folder per skill"]] },
		subagents: { k: "Sub-agents", h: "Agents all the way down", p: "Each folder holds the same convention tree as its parent. A team of specialists is just more folders, built leaf-first.", g: [["agent/GeneratedAgentFactory.bx", "nested agents attached"]] },
		gateways: { k: "Gateways", h: "HTTP, MCP and chat", p: "Expose the agent as a REST API, a web chat UI, or a webhook for a chat platform. Each file is one entry point.", g: [["config/Router.bx", "routes mounted"], ["handlers/", "request handlers"]] },
		schedules: { k: "Schedules", h: "A real ColdBox scheduler", p: "Run the agent on a timetable. The build emits a scheduler, not a wrapper around one.", g: [["config/Scheduler.bx", "your tasks"]] },
		mcp: { k: "MCP", h: "Host MCP servers", p: "Publish tools to any MCP client from the same project.", g: [["mcp/", "servers you host"]] },
		interceptors: { k: "Interceptors", h: "Lifecycle hooks", p: "React to what the agent does without touching the agent itself.", g: [["interceptors/", "your hooks"]] }
	};
	var tabs = $$(".bxa-tree button"), out = $("#out");
	function show(k, anim) {
		var d = T[k]; if (!d || !out) { return; }
		tabs.forEach(function (b) { b.setAttribute("aria-selected", b.getAttribute("data-k") === k ? "true" : "false"); });
		$("#o-k").textContent = d.k; $("#o-h").textContent = d.h; $("#o-p").textContent = d.p;
		var g = $("#o-g"); g.innerHTML = "";
		d.g.forEach(function (r) {
			var e = document.createElement("div"); e.innerHTML = "<b></b> <em></em>";
			e.firstChild.textContent = ".build/app/" + r[0]; e.lastChild.textContent = "  " + r[1]; g.appendChild(e);
		});
		if (anim) { out.classList.remove("bxa-swap"); void out.offsetWidth; out.classList.add("bxa-swap"); }
	}
	tabs.forEach(function (b) {
		b.addEventListener("click", function () { show(b.getAttribute("data-k"), true); });
		b.addEventListener("mouseenter", function () { if (window.matchMedia("(hover: hover)").matches) { show(b.getAttribute("data-k"), true); } });
	});
	show("agent");

	/* code tabs */
	var F = [
		'<span class="bxa-c-k">name</span>: <span class="bxa-c-s">simple-agent</span>\n<span class="bxa-c-k">description</span>: <span class="bxa-c-s">"A baseline agent: one tool, exposed over HTTP."</span>\n<span class="bxa-c-k">model</span>: <span class="bxa-c-s">mock/mock-model</span>',

		'<span class="bxa-c-d"># Simple Agent</span>\n\nYou are Simple Agent, a helpful AI agent.',
		'<span class="bxa-c-k">class</span> {\n\n\t<span class="bxa-c-a">@AITool</span>( <span class="bxa-c-s">"Greet a person by name."</span> )\n\t<span class="bxa-c-k">function</span> greet( name ) {\n\t\t<span class="bxa-c-k">return</span> <span class="bxa-c-s">"Hello, "</span> &amp; arguments.name &amp; <span class="bxa-c-s">"! Welcome to BX Agents."</span>;\n\t}\n\n}'
	];
	var ft = $$(".bxa-tabs button");
	function file(i) { ft.forEach(function (b) { b.setAttribute("aria-selected", b.getAttribute("data-f") == i ? "true" : "false"); }); var c = $("#code"); if (c) { c.innerHTML = F[i]; } }
	ft.forEach(function (b) { b.addEventListener("click", function () { file(b.getAttribute("data-f")); }); });
	file(0);

	/* shared tooltip: gateways and lessons */
	var tip = $("#tip"), cur = null;
	function place(el) {
		var r = el.getBoundingClientRect(), w = tip.offsetWidth, h = tip.offsetHeight, x = r.left + r.width / 2 - w / 2, y = r.bottom + 12;
		if (y + h > window.innerHeight - 8) { y = r.top - h - 12; }
		x = Math.max(12, Math.min(x, window.innerWidth - w - 12));
		tip.style.left = x + "px"; tip.style.top = y + "px";
	}
	function openTip(el, html) {
		cur = el; tip.innerHTML = html;
		$$(".bxa-gw,.bxa-les").forEach(function (g) { g.classList.toggle("bxa-on", g === el); });
		tip.classList.add("bxa-vis"); place(el);
	}
	function closeTip() { cur = null; tip.classList.remove("bxa-vis"); $$(".bxa-gw,.bxa-les").forEach(function (g) { g.classList.remove("bxa-on"); }); }
	function hookTip(el, html) {
		el.addEventListener("mouseenter", function () { openTip(el, html()); });
		el.addEventListener("mouseleave", closeTip);
		el.addEventListener("focus", function () { openTip(el, html()); });
		el.addEventListener("blur", closeTip);
	}
	document.addEventListener("keydown", function (e) { if (e.key === "Escape") { closeTip(); } });
	window.addEventListener("scroll", function () { if (cur) { place(cur); } }, { passive: true });

	var G = {
		slack: { n: "Slack", i: "slack-logo", t: "slack", e: ["SLACK_BOT_TOKEN", "SLACK_APP_TOKEN"], h: "Socket Mode: a persistent websocket, so no public webhook is needed." },
		telegram: { n: "Telegram", i: "telegram-logo", t: "telegram", e: ["TELEGRAM_BOT_TOKEN"], h: "Long-polls getUpdates. Get a token from @BotFather." },
		discord: { n: "Discord", i: "discord-logo", t: "discord", e: ["DISCORD_BOT_TOKEN"], h: "" },
		email: { n: "Email", i: "envelope-simple", t: "email", e: ["IMAP_HOST", "IMAP_USERNAME", "IMAP_PASSWORD", "EMAIL_FROM_ADDRESS"], h: "" },
		whatsapp: { n: "WhatsApp", i: "whatsapp-logo", t: "whatsapp-cloud", e: ["WHATSAPP_ACCESS_TOKEN", "WHATSAPP_PHONE_NUMBER_ID", "WHATSAPP_APP_SECRET", "WHATSAPP_VERIFY_TOKEN"], h: "WhatsApp Cloud API." },
		teams: { n: "Teams", i: "microsoft-teams-logo", t: "teams", e: ["TEAMS_APP_ID", "TEAMS_APP_PASSWORD"], h: "" },
		twilio: { n: "Twilio", i: "phone-call", t: "twilio", e: ["TWILIO_ACCOUNT_SID", "TWILIO_AUTH_TOKEN", "TWILIO_FROM_NUMBER"], h: "" },
		github: { n: "GitHub", i: "github-logo", t: "github", e: ["GITHUB_TOKEN", "GITHUB_WEBHOOK_SECRET", "GITHUB_BOT_NAME"], h: "Webhook driven. Replies to @mentions in issue and PR comment threads." },
		signal: { n: "Signal", i: "signal", t: "signal", e: ["accountEnvVar: the signal-cli registered number"], h: "" },
		http: { n: "http", i: "globe-hemisphere-west", t: "http", e: ["secretEnvVar (required)"], h: "A webhook endpoint for a chat platform or an approval flow. Not the same as exposing the agent's own REST API." },
		cli: { n: "cli", i: "terminal-window", t: "cli", e: [], h: "bx-ai's built-in human-in-the-loop approval channel: a blocking stdin and stdout prompt." },
		mock: { n: "mock", i: "flask", t: "mock", e: [], h: "For tests only." }
	};
	$$(".bxa-gw").forEach(function (a) {
		var d = G[a.getAttribute("data-g")]; if (!d) { return; }
		hookTip(a, function () {
			var li = d.e.map(function (v) { return "<li>" + esc(v) + "</li>"; }).join("");
			return '<h4>' + ico(d.i) + esc(d.n) + '</h4><div class="bxa-ty">gateways/' + esc(d.t) + '.bx &nbsp;<b>type: "' + esc(d.t) + '"</b></div>' + (li ? '<ul>' + li + '</ul>' : '') + (d.h ? '<div class="bxa-how">' + esc(d.h) + '</div>' : '');
		});
	});

	/* course path */
	var STAGES = [
		["Getting started", "Meet BxAgents", [
			[1, "01-welcome", "Welcome to BxAgents", "What this course covers, what you'll build, and how each lesson is organized."],
			[2, "02-what-is-bxagents", "What Is BxAgents?", "Why conventions over configuration, and why assembly happens once at build time."],
			[3, "03-installing-bxagents", "Installing BxAgents", "Install BoxLang, bx-ai and BxAgents, and verify the bxAgents command works."],
			[4, "04-scaffolding-your-first-agent", "Scaffolding Your First Agent", "Run bxAgents new and see exactly what it creates for you."]]],
		["The agent", "Write and run it", [
			[5, "05-agent-bx", "Agent.yaml, the Agent Itself", "The one required file: a name, a model and your settings in plain YAML."],
			[6, "06-instructions-and-system-prompt", "instructions.md and the System Prompt", "The optional file that becomes your agent's system prompt."],
			[7, "07-building-your-agent", "Building Your Agent", "bxAgents build and the five-phase pipeline that turns your project into an app."],
			[8, "08-talking-to-your-agent", "Talking to Your Agent", "chat, invoke and serve: three ways to run the exact same built agent."]]],
		["Capabilities", "Tools to teams", [
			[9, "09-giving-your-agent-tools", "Giving Your Agent Tools", "Any @AITool annotated function under tools/ becomes a callable tool."],
			[10, "10-packaging-skills", "Packaging Skills", "Claude Agent Skills: one subfolder per SKILL.md, loaded on demand."],
			[11, "11-composing-subagents", "Composing Subagents", "Nested agents, each an ordinary BxAgents project of its own, wired as callable tools."],
			[12, "12-named-model-configs", "Named Model Configs", "Reusable named model configurations, referenced from Agent.yaml by name."]]],
		["Reach users", "HTTP, chat, web", [
			[13, "13-exposing-http-and-mcp", "Exposing Your Agent over HTTP and MCP", "gateways/ entries with an exposes key turn your agent into a real HTTP route."],
			[14, "14-connecting-chat-platforms", "Connecting Chat Platforms", "Channel adapter gateways: nine chat platforms plus http, cli and mock, all one GatewaySession."],
			[15, "15-the-generated-web-chat-ui", "The Generated Web Chat UI", "A complete browser chat client: sidebar, streaming, approvals, SQLite store."]]],
		["Beyond chat", "Run on its own", [
			[16, "16-scheduling-background-work", "Scheduling Background Work", "schedules/Scheduler.bx, a real hand written ColdBox scheduler, passed through untouched."],
			[17, "17-hosting-mcp-servers", "Hosting and Consuming MCP Servers", "MCP in both directions: consume remote servers from Agent.yaml, host your own under mcp/."],
			[18, "18-interceptors-and-modules", "Interceptors and Module Dependencies", "ColdBox lifecycle hooks scoped by @scope, and BoxLang module dependencies under modules/."]]],
		["Ship it", "Test and deploy", [
			[19, "19-testing-your-agent", "Testing Your Agent", "A ready to run TestBox suite, mockResponses(), and matchers built for agent behavior."],
			[20, "20-packaging-deploying-and-wrapping-up", "Packaging, Deploying, and Wrapping Up", "Package to a .bxa, ship it to a real target, and where to go from here."]]]
	];
	var pathEl = $("#path");
	if (pathEl) {
		STAGES.forEach(function (st) {
			var row = document.createElement("div"); row.className = "bxa-stagerow";
			row.innerHTML = '<h3>' + esc(st[0]) + '<b>' + esc(st[1]) + '</b></h3><div class="bxa-les-row"></div>';
			var lr = row.querySelector(".bxa-les-row");
			st[2].forEach(function (l) {
				var a = document.createElement("a"); a.className = "bxa-les"; a.textContent = l[0];
				a.href = BASE + "course/" + l[1] + "/"; a.setAttribute("aria-label", "Lesson " + l[0] + ": " + l[2]);
				hookTip(a, function () { return '<h4>' + ico("book-open-text") + 'Lesson ' + l[0] + '</h4><div class="bxa-ty"><b>' + esc(l[2]) + '</b></div><div class="bxa-how">' + esc(l[3]) + '</div>'; });
				lr.appendChild(a);
			});
			pathEl.appendChild(row);
		});
	}

	/* HTTP replay: a real capture */
	var rp = $("#replay");
	if (rp && TRANSCRIPT.length) {
		var lines = [];
		TRANSCRIPT.forEach(function (t) {
			lines.push({ c: "p", t: "$ " + t.command.replace(/ -H /g, " \\\n    -H ").replace(/ -d /g, " \\\n    -d ") });
			lines.push({ c: "ok", t: String(t.status).trim() });
			var h = t.headers || {};
			Object.keys(h).forEach(function (k) { if (/^(content-type|x-thread-id)$/i.test(k)) { lines.push({ c: "d", t: k + ": " + h[k] }); } });
			var body = String(t.body || "").replace(/\n$/, "");
			lines.push({ c: "", t: body.length > 150 ? body.replace(/,"/g, ',\n  "') : body });
			if (t.ms != null) { lines.push({ c: "d", t: "# " + t.ms + " ms" }); }
			lines.push({ c: "", t: "" });
		});
		rp.innerHTML = lines.map(function (l) { return l.c ? '<span class="bxa-t-' + l.c + '">' + esc(l.t) + '</span>' : esc(l.t); }).join("\n") + '<span class="bxa-cur"></span>';
		try {
			var info = JSON.parse(TRANSCRIPT[1].body), box = $("#routes");
			if (box) { box.innerHTML = info.endpoints.map(function (e) { return '<div class="bxa-route"><b class="' + (e.verb === "GET" ? "bxa-get" : "") + '">' + esc(e.verb) + '</b>' + esc(e.path) + '<span>' + esc(e.description) + '</span></div>'; }).join(""); }
		} catch (x) { /* the routes list is optional */ }
	}

	/* starter explorer: the real scaffolder output */
	var ORDER = ["minimal", "webui-chat", "slack-bot", "telegram-bot", "github-bot", "mcp-server", "scheduled", "multi-agent"];
	var META = {
		"minimal": ["leaf", "The bare skeleton"],
		"webui-chat": ["chat-circle-dots", "A browser chat UI at /chat"],
		"slack-bot": ["slack-logo", "Slack Socket Mode adapter"],
		"telegram-bot": ["telegram-logo", "Telegram long-poll adapter"],
		"github-bot": ["github-logo", "Issue and PR webhook adapter"],
		"mcp-server": ["plugs-connected", "An example tool as an MCP server"],
		"scheduled": ["clock-countdown", "A ColdBox scheduler calls the agent"],
		"multi-agent": ["users-three", "Two subagents wired via subAgents"]
	};
	var list = $("#ex-list"), tree = $("#ex-tree"), codeEl = $("#ex-code"), curT = "minimal";
	function hl(text, path) {
		var s = esc(text);
		if (/\.bx$/.test(path)) {
			return s.replace(/(\/\/[^\n]*)|("[^"\n]*")|(@AITool)|\b(class|extends|function|return|this|super)\b/g, function (m, c, str, ann) {
				return '<span class="' + (c ? "bxa-c-d" : str ? "bxa-c-s" : ann ? "bxa-c-a" : "bxa-c-k") + '">' + m + '</span>';
			});
		}
		if (/\.ya?ml$/.test(path)) {
			return s.replace(/(#[^\n]*)|^([A-Za-z][\w-]*)(?=:)|("[^"\n]*")/gm, function (m, c, key, str) {
				return '<span class="' + (c ? "bxa-c-d" : key ? "bxa-c-k" : "bxa-c-s") + '">' + m + '</span>';
			});
		}
		return s.replace(/^(#[^\n]*)/gm, '<span class="bxa-c-d">$1</span>');
	}
	function build(t) {
		var d = STARTERS[t], root = { d: {}, f: [] };
		d.files.forEach(function (f) { var parts = f.path.split("/"), n = root; for (var i = 0; i < parts.length - 1; i++) { n = n.d[parts[i]] = n.d[parts[i]] || { d: {}, f: [] }; } n.f.push({ name: parts[parts.length - 1], e: f }); });
		d.empty.forEach(function (p) { var parts = p.split("/"), n = root; for (var i = 0; i < parts.length; i++) { n = n.d[parts[i]] = n.d[parts[i]] || { d: {}, f: [], empty: i === parts.length - 1 }; } });
		return root;
	}
	function badge(status) { return status === "added" ? '<span class="bxa-badge bxa-new">new</span>' : status === "changed" ? '<span class="bxa-badge bxa-chg">changed</span>' : ""; }
	function renderTree(t) {
		tree.innerHTML = ""; var root = build(t), first = null;
		(function walk(n, depth) {
			Object.keys(n.d).sort().forEach(function (k) {
				var c = n.d[k], has = c.f.length || Object.keys(c.d).length;
				var r = document.createElement("div"); r.className = "bxa-row bxa-dir" + (c.empty && !has ? " bxa-empty" : ""); r.style.paddingLeft = (8 + depth * 16) + "px";
				r.innerHTML = ico("folder-simple") + k + "/" + (c.empty && !has ? "<em>empty</em>" : "");
				tree.appendChild(r); walk(c, depth + 1);
			});
			n.f.sort(function (a, b) { return a.name < b.name ? -1 : 1; }).forEach(function (f) {
				var b = document.createElement("button"); b.className = "bxa-row"; b.setAttribute("role", "treeitem"); b.style.paddingLeft = (8 + depth * 16) + "px"; b.setAttribute("data-p", f.e.path);
				b.innerHTML = ico(/\.bx$/.test(f.name) ? "file-code" : "file-text") + f.name + badge(f.e.status);
				b.addEventListener("click", function () { openFile(f.e); });
				tree.appendChild(b);
				if (!first && f.e.status !== "base") { first = f.e; }
			});
		})(root, 0);
		return first;
	}
	function openFile(e) {
		$$("button.bxa-row", tree).forEach(function (b) { b.setAttribute("aria-selected", b.getAttribute("data-p") === e.path ? "true" : "false"); });
		$("#ex-path").textContent = e.path; $("#ex-badge").innerHTML = badge(e.status); codeEl.innerHTML = hl(e.content, e.path);
	}
	function pick(t) {
		curT = t; $$("button", list).forEach(function (b) { b.setAttribute("aria-selected", b.getAttribute("data-t") === t ? "true" : "false"); });
		$("#ex-t").textContent = t;
		var first = renderTree(t), d = STARTERS[t];
		openFile(first || d.files.filter(function (f) { return f.path === "Agent.yaml"; })[0]);
	}
	if (list && tree && STARTERS.minimal) {
		ORDER.forEach(function (t) {
			var b = document.createElement("button"); b.setAttribute("role", "tab"); b.setAttribute("data-t", t);
			b.innerHTML = ico(META[t][0]) + '<span><b>' + t + '</b><small>' + META[t][1] + '</small></span>';
			b.addEventListener("click", function () { pick(t); }); list.appendChild(b);
		});
		wireCopy($("#ex-copy"), function () { return "bxAgents new my-agent --model=openai/gpt-5 --template=" + curT; });
		pick("minimal");
	}

	/* walkthrough videos: real recordings */
	var VIDEOS = [
		{ id: "quickstart", tab: "Quick start", title: "From nothing to a running agent", text: "Scaffold a project from the web chat starter, build it, inspect the manifest and serve it.", cmd: "bxAgents new, build, inspect, serve" },
		{ id: "chat-desktop", tab: "Web chat", title: "The generated chat UI", text: "A reply streams in live, a second turn follows, then the theme toggle and a new chat. Every answer is the mock provider's \"Mock response\".", cmd: "exposes: \"webui\"" },
		{ id: "chat-mobile", tab: "On a phone", title: "The same chat on a phone", text: "The same generated page at 390 pixels wide. The sidebar starts closed so the composer stays in reach.", cmd: "exposes: \"webui\"" },
		{ id: "http-gateway", tab: "HTTP API", title: "An agent behind a REST API", text: "One gateway file, then curl against the invoke, info and streaming routes.", cmd: "exposes: \"agent\"" },
		{ id: "starters", tab: "Starters", title: "Three starters, side by side", text: "Scaffold slack-bot, multi-agent and mcp-server projects and list what each one contains.", cmd: "bxAgents new --template=<name>" },
		{ id: "mcp", tab: "MCP", title: "Serving MCP tools", text: "A served project answers MCP JSON-RPC: list the tools, then call one over HTTP.", cmd: "exposes: \"mcp\"" }
	];
	var vt = $("#vtabs"), vv = $("#vvideo"), vs = $("#vsrc"), vs2 = $("#vsrc2");
	if (vt && vv) {
		function setVideo(i, play) {
			var v = VIDEOS[i];
			$$("button", vt).forEach(function (b, n) { b.setAttribute("aria-selected", n === i ? "true" : "false"); });
			vv.pause(); vs.src = BASE + "assets/video/" + v.id + ".mp4"; vs2.src = BASE + "assets/video/" + v.id + ".webm"; vv.poster = BASE + "assets/video/" + v.id + "-poster.png"; vv.load();
			$("#vtitle").textContent = v.title; $("#vtext").textContent = v.text; $("#vcmd").textContent = v.cmd;
			if (play && !reduce) { var p = vv.play(); if (p && p.catch) { p.catch(function () { /* autoplay refused: the controls remain */ }); } }
		}
		VIDEOS.forEach(function (v, i) {
			var b = document.createElement("button"); b.setAttribute("role", "tab"); b.className = "bxa-vtab"; b.textContent = v.tab;
			b.addEventListener("click", function () { setVideo(i, true); }); vt.appendChild(b);
		});
		setVideo(0, false);
		if ("IntersectionObserver" in window && !reduce) {
			new IntersectionObserver(function (en) { en.forEach(function (e) { if (e.isIntersecting) { var p = vv.play(); if (p && p.catch) { p.catch(function () {}); } } else { vv.pause(); } }); }, { threshold: 0.5 }).observe(vv);
		}
	}
})();
