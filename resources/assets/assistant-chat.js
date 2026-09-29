const state = {
  busy: false,
  userId: null,
  storeKey: "assistantChat:v1",
  posKey: "assistantChat:pos",
  pos: null,
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

    state.endpoint = root.dataset.endpoint;
    state.name = root.dataset.name || "assistant";
    state.welcome = root.dataset.welcome || "";
    // One saved chat per scope, so a different user/role never sees the previous chat
    state.storeKey = `assistantChat:v1:${root.dataset.scope || "guest"}`;
    try {
      state.quick = JSON.parse(root.dataset.quick || "[]");
    } catch (e) {
      state.quick = [];
    }
    state.el = {
      toggle: document.getElementById("assistantChatToggle"),
      panel: document.getElementById("assistantChatPanel"),
      close: document.getElementById("assistantChatClose"),
      newChat: document.getElementById("assistantChatNew"),
      log: document.getElementById("assistantChatLog"),
      form: document.getElementById("assistantChatForm"),
      input: document.getElementById("assistantChatInput"),
      send: document.getElementById("assistantChatSend"),
    };
    state.userId = AssistantChatConfig.AssistantChatConfigUserId();
    state.el.toggle.title =
      state.name.charAt(0).toUpperCase() +
      state.name.slice(1) +
      ". Drag to move.";

    AssistantChatConfig.AssistantChatConfigBind();
    AssistantChatConfig.AssistantChatConfigRestorePosition();

    // A browser refresh starts a new conversation; moving between pages keeps it.
    const nav = performance.getEntriesByType("navigation")[0];
    if (nav && nav.type === "reload") {
      try {
        sessionStorage.removeItem(state.storeKey);
      } catch (e) {
        /* ignore */
      }
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
    const { toggle, close, form, input } = state.el;
    toggle.addEventListener("click", () => {
      if (state.suppressClick) return;
      AssistantChatConfig.AssistantChatConfigToggle(state.el.panel.hidden);
    });
    AssistantChatConfig.AssistantChatConfigDraggable(toggle);
    AssistantChatConfig.AssistantChatConfigDraggable(
      state.el.panel.querySelector(".asst-head"),
    );
    window.addEventListener("resize", () => {
      if (state.pos)
        AssistantChatConfig.AssistantChatConfigMoveTo(
          state.pos.left,
          state.pos.top,
        );
      else if (!state.el.panel.hidden)
        AssistantChatConfig.AssistantChatConfigPlace();
    });
    close.addEventListener("click", () =>
      AssistantChatConfig.AssistantChatConfigToggle(false),
    );
    state.el.newChat.addEventListener("click", () =>
      AssistantChatConfig.AssistantChatConfigReset(),
    );
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && !state.el.panel.hidden)
        AssistantChatConfig.AssistantChatConfigToggle(false);
    });
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      AssistantChatConfig.AssistantChatConfigSend(input.value);
    });
  }

  static AssistantChatConfigToggle(open) {
    const { toggle, panel, input } = state.el;
    toggle.setAttribute("aria-expanded", String(open));
    panel.hidden = !open;
    if (open) AssistantChatConfig.AssistantChatConfigPlace();
    toggle.setAttribute(
      "aria-label",
      open ? `Close ${state.name}` : `Open ${state.name}`,
    );
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

  static AssistantChatConfigIsMobile() {
    return window.matchMedia("(max-width: 575.98px)").matches;
  }

  // Drag either handle (launcher or panel header); both move the launcher and the panel follows it.
  static AssistantChatConfigDraggable(handle) {
    let drag = null;

    handle.addEventListener("pointerdown", (e) => {
      if (e.button !== 0 || e.target.closest(".asst-icon-btn")) return;
      if (
        handle !== state.el.toggle &&
        AssistantChatConfig.AssistantChatConfigIsMobile()
      )
        return;
      const r = state.el.toggle.getBoundingClientRect();
      drag = {
        id: e.pointerId,
        x: e.clientX,
        y: e.clientY,
        left: r.left,
        top: r.top,
        moved: false,
      };
      handle.setPointerCapture(e.pointerId);
    });

    handle.addEventListener("pointermove", (e) => {
      if (!drag || e.pointerId !== drag.id) return;
      const dx = e.clientX - drag.x;
      const dy = e.clientY - drag.y;
      if (!drag.moved && Math.hypot(dx, dy) < 5) return; // a tiny movement is still a tap
      drag.moved = true;
      handle.classList.add("is-dragging");
      AssistantChatConfig.AssistantChatConfigMoveTo(
        drag.left + dx,
        drag.top + dy,
      );
    });

    const finish = (e) => {
      if (!drag || e.pointerId !== drag.id) return;
      handle.classList.remove("is-dragging");
      if (drag.moved) {
        state.suppressClick = true; // the drop must not count as a click on the launcher
        setTimeout(() => {
          state.suppressClick = false;
        }, 0);
        try {
          localStorage.setItem(state.posKey, JSON.stringify(state.pos));
        } catch (err) {
          /* storage unavailable */
        }
      }
      drag = null;
    };
    handle.addEventListener("pointerup", finish);
    handle.addEventListener("pointercancel", finish);
  }

  static AssistantChatConfigMoveTo(left, top) {
    const t = state.el.toggle;
    const maxLeft = Math.max(8, window.innerWidth - t.offsetWidth - 8);
    const maxTop = Math.max(8, window.innerHeight - t.offsetHeight - 8);
    left = Math.min(Math.max(8, left), maxLeft);
    top = Math.min(Math.max(8, top), maxTop);
    Object.assign(t.style, {
      left: `${left}px`,
      top: `${top}px`,
      right: "auto",
      bottom: "auto",
    });
    state.pos = { left, top };
    if (!state.el.panel.hidden) AssistantChatConfig.AssistantChatConfigPlace();
  }

  static AssistantChatConfigPlace() {
    const panel = state.el.panel;
    if (AssistantChatConfig.AssistantChatConfigIsMobile()) {
      ["left", "top", "right", "bottom"].forEach((k) => {
        panel.style[k] = "";
      });
      return;
    }
    const r = state.el.toggle.getBoundingClientRect();
    const w = panel.offsetWidth;
    const h = panel.offsetHeight;
    const gap = 12;
    const left = Math.min(Math.max(8, r.right - w), window.innerWidth - w - 8);
    let top = r.top - h - gap; // prefer above the launcher
    if (top < 8) top = r.bottom + gap; // otherwise below it
    top = Math.min(Math.max(8, top), window.innerHeight - h - 8);
    Object.assign(panel.style, {
      left: `${left}px`,
      top: `${top}px`,
      right: "auto",
      bottom: "auto",
    });
  }

  static AssistantChatConfigRestorePosition() {
    try {
      const saved = JSON.parse(localStorage.getItem(state.posKey) || "null");
      if (saved && Number.isFinite(saved.left) && Number.isFinite(saved.top)) {
        AssistantChatConfig.AssistantChatConfigMoveTo(saved.left, saved.top);
      }
    } catch (e) {
      /* no saved position */
    }
  }

  static AssistantChatConfigRestore() {
    let saved = [];
    try {
      saved = JSON.parse(sessionStorage.getItem(state.storeKey) || "[]");
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
    sub.textContent = state.welcome;
    box.append(title, sub);

    state.quick.forEach((a) => {
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
          state.el.input.value = a.prefill || "";
          state.el.input.focus();
        }
      });
      box.appendChild(btn);
    });
    state.el.log.appendChild(box);
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
      new Date().toLocaleTimeString([], {
        hour: "numeric",
        minute: "2-digit",
      });
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
    state.el.log.appendChild(row);
    AssistantChatConfig.AssistantChatConfigScroll();

    if (persist && role !== "error") {
      try {
        const saved = JSON.parse(
          sessionStorage.getItem(state.storeKey) || "[]",
        );
        saved.push({ role, text, time: stamp });
        sessionStorage.setItem(
          state.storeKey,
          JSON.stringify(saved.slice(-30)),
        );
      } catch (e) {
        /* storage unavailable: chat still works */
      }
    }
  }

  // A bot message with buttons (e.g. Confirm / Cancel). Buttons are single use.
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
        bar.querySelectorAll("button").forEach((b) => {
          b.disabled = true;
        });
        AssistantChatConfig.AssistantChatConfigSend(a.value, a.text);
      });
      bar.appendChild(btn);
    });

    row.append(bubble, bar);
    state.el.log.appendChild(row);
    AssistantChatConfig.AssistantChatConfigScroll();
  }

  static AssistantChatConfigTyping() {
    const row = document.createElement("div");
    row.className = "asst-row asst-row--bot";
    row.innerHTML =
      '<div class="asst-msg asst-typing" aria-label="Assistant is typing"><i></i><i></i><i></i></div>';
    state.el.log.appendChild(row);
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

    return fetch(state.endpoint, {
      method: "POST",
      headers,
      credentials: "same-origin",
      body: new URLSearchParams({
        driver: "web",
        userId: state.userId,
        message,
      }),
    });
  }

  static AssistantChatConfigReset() {
    if (state.busy) return;
    try {
      sessionStorage.removeItem(state.storeKey);
    } catch (e) {
      /* ignore */
    }
    state.el.log.innerHTML = "";
    AssistantChatConfig.AssistantChatConfigWelcome();
    // The model's memory of the chat lives on the server, so clear that too.
    AssistantChatConfig.AssistantChatConfigPost("__reset__").catch(() => {});
    state.el.input.focus();
  }

  static AssistantChatConfigScroll() {
    state.el.log.scrollTop = state.el.log.scrollHeight;
  }

  // `label` is what the person sees in their bubble when the value sent is a button command.
  static async AssistantChatConfigSend(raw, label) {
    const text = (raw || "").trim();
    if (!text || state.busy) return;

    state.busy = true;
    state.el.send.disabled = true;
    document.getElementById("assistantChatWelcome")?.remove();
    AssistantChatConfig.AssistantChatConfigAdd("user", label || text);
    state.el.input.value = "";
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
      state.busy = false;
      state.el.send.disabled = false;
      state.el.input.focus();
    }
  }
}

AssistantChatConfig.AssistantChatConfigInit();
