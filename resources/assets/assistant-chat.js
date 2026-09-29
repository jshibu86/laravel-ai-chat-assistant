const asstState = {
  busy: false,
  userId: null,
  storeKey: "assistantChat:v1",
  suppressClick: false,
  name: "assistant",
  welcome: "How can I help?",
  quick: [],
  el: {},
};

class AssistantChatConfig {
  static AssistantChatConfigInit() {
    const root = document.getElementById("assistantChat");
    if (!root) return;

    asstState.endpoint = root.dataset.endpoint;
    asstState.name = root.dataset.name || "assistant";
    asstState.welcome = root.dataset.welcome || "";
    asstState.storeKey = `assistantChat:v1:${root.dataset.scope || "guest"}`;
    try {
      asstState.quick = JSON.parse(root.dataset.quick || "[]");
    } catch (e) {
      asstState.quick = [];
    }
    asstState.el = {
      toggle: document.getElementById("assistantChatToggle"),
      panel: document.getElementById("assistantChatPanel"),
      close: document.getElementById("assistantChatClose"),
      newChat: document.getElementById("assistantChatNew"),
      log: document.getElementById("assistantChatLog"),
      form: document.getElementById("assistantChatForm"),
      input: document.getElementById("assistantChatInput"),
      send: document.getElementById("assistantChatSend"),
    };
    asstState.userId = AssistantChatConfig.AssistantChatConfigUserId();

    AssistantChatConfig.AssistantChatConfigBind();

    const nav = performance.getEntriesByType("navigation")[0];
    if (nav && nav.type === "reload") {
      try {
        sessionStorage.removeItem(asstState.storeKey);
      } catch (e) {}
      AssistantChatConfig.AssistantChatConfigPost("__reset__").catch(() => {});
    }
    AssistantChatConfig.AssistantChatConfigRestore();
  }

  static AssistantChatConfigUserId() {
    try {
      let id = sessionStorage.getItem("assistantChat:uid");
      if (!id) {
        id = crypto.randomUUID
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random()}`;
        sessionStorage.setItem("assistantChat:uid", id);
      }
      return id;
    } catch (e) {
      return `${Date.now()}-${Math.random()}`;
    }
  }

  static AssistantChatConfigBind() {
    const { toggle, close, form, input } = asstState.el;
    toggle.addEventListener("click", () => {
      if (asstState.suppressClick) return;
      AssistantChatConfig.AssistantChatConfigToggle(asstState.el.panel.hidden);
    });
    close.addEventListener("click", () =>
      AssistantChatConfig.AssistantChatConfigToggle(false),
    );
    asstState.el.newChat.addEventListener("click", () =>
      AssistantChatConfig.AssistantChatConfigReset(),
    );
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && !asstState.el.panel.hidden) {
        AssistantChatConfig.AssistantChatConfigToggle(false);
      }
    });
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      AssistantChatConfig.AssistantChatConfigSend(input.value);
    });
  }

  static AssistantChatConfigToggle(open) {
    const { toggle, panel, input } = asstState.el;
    toggle.setAttribute("aria-expanded", String(open));
    panel.hidden = !open;
    toggle.querySelector("i").className = open
      ? "fas fa-times"
      : "fas fa-comments";
    if (open) {
      AssistantChatConfig.AssistantChatConfigScroll();
      input.focus();
    } else {
      toggle.focus();
    }
  }

  static AssistantChatConfigRestore() {
    let saved = [];
    try {
      saved = JSON.parse(sessionStorage.getItem(asstState.storeKey) || "[]");
    } catch (e) {
      saved = [];
    }
    if (!saved.length) {
      AssistantChatConfig.AssistantChatConfigWelcome();
      return;
    }
    saved.forEach((m) =>
      AssistantChatConfig.AssistantChatConfigAdd(m.role, m.text, m.time, false),
    );
  }

  static AssistantChatConfigWelcome() {
    const box = document.createElement("div");
    box.className = "asst-welcome";
    box.id = "assistantChatWelcome";

    const title = document.createElement("p");
    title.className = "asst-welcome-title";
    title.textContent = "How can I help?";
    const sub = document.createElement("p");
    sub.className = "asst-welcome-sub";
    sub.textContent = asstState.welcome;
    box.append(title, sub);

    asstState.quick.forEach((a) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "asst-chip";

      const icon = document.createElement("i");
      icon.className = `fas ${a.icon}`;
      icon.setAttribute("aria-hidden", "true");
      const label = document.createElement("span");
      label.textContent = a.label;
      btn.append(icon, label);

      btn.addEventListener("click", () => {
        if (a.send) {
          AssistantChatConfig.AssistantChatConfigSend(a.send);
        } else {
          asstState.el.input.value = a.prefill || "";
          asstState.el.input.focus();
        }
      });
      box.appendChild(btn);
    });
    asstState.el.log.appendChild(box);
  }

  static AssistantChatConfigFormat(text) {
    const escaped = text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
    return escaped
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/`([^`]+)`/g, "<code>$1</code>");
  }

  static AssistantChatConfigAdd(role, text, time, persist = true) {
    const stamp =
      time ||
      new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
    const row = document.createElement("div");
    row.className = `asst-row asst-row--${role}`;

    const bubble = document.createElement("div");
    bubble.className = "asst-msg";
    if (role === "user") bubble.textContent = text;
    else bubble.innerHTML = AssistantChatConfig.AssistantChatConfigFormat(text);

    const meta = document.createElement("span");
    meta.className = "asst-time";
    meta.textContent = stamp;

    row.append(bubble, meta);
    asstState.el.log.appendChild(row);
    AssistantChatConfig.AssistantChatConfigScroll();

    if (persist && role !== "error") {
      try {
        const saved = JSON.parse(
          sessionStorage.getItem(asstState.storeKey) || "[]",
        );
        saved.push({ role, text, time: stamp });
        sessionStorage.setItem(
          asstState.storeKey,
          JSON.stringify(saved.slice(-30)),
        );
      } catch (e) {}
    }
  }

  static AssistantChatConfigAddActions(text, actions) {
    const row = document.createElement("div");
    row.className = "asst-row asst-row--bot";

    const bubble = document.createElement("div");
    bubble.className = "asst-msg";
    bubble.textContent = text;

    const bar = document.createElement("div");
    bar.className = "asst-actions";
    actions.forEach((a, index) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className =
        index === 0 ? "asst-action asst-action--primary" : "asst-action";
      btn.textContent = a.text;
      btn.addEventListener("click", () => {
        bar.querySelectorAll("button").forEach((b) => (b.disabled = true));
        AssistantChatConfig.AssistantChatConfigSend(a.value, a.text);
      });
      bar.appendChild(btn);
    });

    row.append(bubble, bar);
    asstState.el.log.appendChild(row);
    AssistantChatConfig.AssistantChatConfigScroll();
  }

  static AssistantChatConfigTyping() {
    const row = document.createElement("div");
    row.className = "asst-row asst-row--bot";
    row.innerHTML =
      '<div class="asst-msg asst-typing" aria-label="Assistant is typing"><i></i><i></i><i></i></div>';
    asstState.el.log.appendChild(row);
    AssistantChatConfig.AssistantChatConfigScroll();
    return row;
  }

  static AssistantChatConfigPost(message) {
    const headers = {
      "Content-Type": "application/x-www-form-urlencoded",
      "X-Requested-With": "XMLHttpRequest",
    };
    const csrf = document.querySelector('meta[name="csrf-token"]')?.content;
    if (csrf) headers["X-CSRF-TOKEN"] = csrf;

    return fetch(asstState.endpoint, {
      method: "POST",
      headers,
      credentials: "same-origin",
      body: new URLSearchParams({
        driver: "web",
        userId: asstState.userId,
        message,
      }),
    });
  }

  static AssistantChatConfigReset() {
    if (asstState.busy) return;
    try {
      sessionStorage.removeItem(asstState.storeKey);
    } catch (e) {}
    asstState.el.log.innerHTML = "";
    AssistantChatConfig.AssistantChatConfigWelcome();
    AssistantChatConfig.AssistantChatConfigPost("__reset__").catch(() => {});
    asstState.el.input.focus();
  }

  static AssistantChatConfigScroll() {
    asstState.el.log.scrollTop = asstState.el.log.scrollHeight;
  }

  static async AssistantChatConfigSend(raw, label) {
    const text = (raw || "").trim();
    if (!text || asstState.busy) return;

    asstState.busy = true;
    asstState.el.send.disabled = true;
    document.getElementById("assistantChatWelcome")?.remove();
    AssistantChatConfig.AssistantChatConfigAdd("user", label || text);
    asstState.el.input.value = "";
    const typing = AssistantChatConfig.AssistantChatConfigTyping();

    try {
      const res = await AssistantChatConfig.AssistantChatConfigPost(text);
      const data = await res.json();
      const replies = (data.messages || []).filter(
        (m) => ["text", "actions"].includes(m.type) && m.text,
      );
      if (!res.ok || !replies.length) throw new Error("No reply");

      typing.remove();
      replies.forEach((m) => {
        if (m.type === "actions" && m.actions?.length) {
          AssistantChatConfig.AssistantChatConfigAddActions(m.text, m.actions);
        } else {
          AssistantChatConfig.AssistantChatConfigAdd("bot", m.text);
        }
      });
    } catch (e) {
      typing.remove();
      AssistantChatConfig.AssistantChatConfigAdd(
        "error",
        "The assistant could not answer. Check your connection and try again.",
      );
    } finally {
      asstState.busy = false;
      asstState.el.send.disabled = false;
      asstState.el.input.focus();
    }
  }
}

AssistantChatConfig.AssistantChatConfigInit();
