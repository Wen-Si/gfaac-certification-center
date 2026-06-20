/* ============================================================
   GFAAC — CertAdvisor AI (powered by Zhipu GLM-4.5-Flash)
   ============================================================ */

const GFAAC_API = {
  endpoint: "https://open.bigmodel.cn/api/paas/v4/chat/completions",
  apiKey: "325d6fa364954d2e871c30ba95b553bd.KBdQdqgJgELJBhnv",
  model: "glm-4.5-flash",
};

const SYSTEM_PROMPT = `You are CertAdvisor AI, the official certification advisor of the Global Financial AI Agent Certification & Accreditation Center (GFAAC).

Your role: guide organizations through financial AI agent certification. Be authoritative, precise, and helpful. Use concise, well-structured responses with short paragraphs and bullet points where useful.

About GFAAC:
- An independent international body that certifies financial AI agents for trust, compliance, security, and excellence.
- Mission: evaluate, certify, and accredit financial AI agents worldwide against rigorous standards.

Four certification tiers:
1. Foundation (I) — Entry-level: baseline accuracy & reliability testing, data handling & privacy review, basic transparency disclosure.
2. Professional (II) — Production-ready: robustness & adversarial stress tests, bias & fairness audit, regulatory alignment verification, incident response procedures.
3. Enterprise (III) — Mission-critical: full nine-standard assessment, continuous monitoring integration, explainability & audit trail certification, cross-jurisdictional compliance map, annual recertification commitment. (Most pursued tier.)
4. Sovereign (IV) — Systemic-scale: systemic-risk impact analysis, sovereign-grade security review, real-time regulator data sharing, end-to-end governance certification.

Nine core assessment standards:
1. Accuracy & Reliability
2. Robustness & Adversarial Resilience
3. Bias & Fairness
4. Data Privacy & Protection
5. Security & Access Control
6. Transparency & Explainability
7. Regulatory Compliance
8. Auditability & Logging
9. Operational Governance

Domain-specific endorsements: Algorithmic Trading, Credit Underwriting, Risk Modeling, RegTech & Compliance, Wealth Advisory, Fraud Detection, Insurance Pricing, ESG Analytics.

Five-stage certification process:
1. Application — submit agent profile, use case, documentation.
2. Intake & Triage — AI readiness scan, panel assignment.
3. Multi-Standard Evaluation — testing across all nine standards.
4. Panel Review — human experts review findings and decide.
5. Certification — verifiable digital certificate, public registry entry, continuous-monitoring plan.

GFAAC is aligned with ISO/IEC 42001, Basel III AI Guidance, EU AI Act, SEC Reg AI, MiFID II, and GDPR.

Guidelines:
- Always answer in English.
- Stay in character as the GFAAC certification advisor.
- If asked something outside financial AI certification scope, gently steer back to certification topics.
- Recommend the appropriate tier based on the user's described agent and use case.
- Encourage users to submit a formal application for actual certification.
- Keep responses focused and not overly long.`;

/* ---------- State ---------- */
const messages = [{ role: "system", content: SYSTEM_PROMPT }];
let isResponding = false;

/* ---------- DOM ---------- */
const chatMessages = document.getElementById("chatMessages");
const chatForm = document.getElementById("chatForm");
const chatInput = document.getElementById("chatInput");
const chatSend = document.getElementById("chatSend");

/* ---------- Helpers ---------- */
function addMsg(role, text) {
  const wrap = document.createElement("div");
  wrap.className = "msg " + (role === "user" ? "msg--user" : "msg--bot");
  const avatar = document.createElement("div");
  avatar.className = "msg__avatar";
  avatar.textContent = role === "user" ? "You" : "CA";
  const bubble = document.createElement("div");
  bubble.className = "msg__bubble";
  wrap.appendChild(avatar);
  wrap.appendChild(bubble);
  chatMessages.appendChild(wrap);
  chatMessages.scrollTop = chatMessages.scrollHeight;
  return bubble;
}

function addTyping() {
  const wrap = document.createElement("div");
  wrap.className = "msg msg--bot";
  wrap.id = "typingMsg";
  wrap.innerHTML =
    '<div class="msg__avatar">CA</div><div class="msg__bubble"><div class="typing"><span></span><span></span><span></span></div></div>';
  chatMessages.appendChild(wrap);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}
function removeTyping() {
  const t = document.getElementById("typingMsg");
  if (t) t.remove();
}

/* Simple markdown-ish renderer for chat bubbles */
function renderMarkdown(text) {
  let html = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  // code spans
  html = html.replace(/`([^`]+)`/g, "<code>$1</code>");
  // bold
  html = html.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  // headings (### )
  html = html.replace(/^### (.+)$/gm, '<p><strong>$1</strong></p>');
  // bullet lists
  const lines = html.split("\n");
  let out = [];
  let inList = false;
  for (const line of lines) {
    if (/^\s*[-*] /.test(line)) {
      if (!inList) { out.push("<ul>"); inList = true; }
      out.push("<li>" + line.replace(/^\s*[-*] /, "") + "</li>");
    } else if (/^\s*\d+\.\s/.test(line)) {
      if (!inList) { out.push("<ul>"); inList = true; }
      out.push("<li>" + line.replace(/^\s*\d+\.\s/, "") + "</li>");
    } else {
      if (inList) { out.push("</ul>"); inList = false; }
      if (line.trim()) out.push("<p>" + line + "</p>");
    }
  }
  if (inList) out.push("</ul>");
  return out.join("");
}

/* ---------- Streaming chat ---------- */
async function sendChat(userText) {
  if (isResponding || !userText.trim()) return;
  isResponding = true;
  chatSend.disabled = true;

  addMsg("user", userText);
  messages.push({ role: "user", content: userText });

  addTyping();

  try {
    const res = await fetch(GFAAC_API.endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + GFAAC_API.apiKey,
      },
      body: JSON.stringify({
        model: GFAAC_API.model,
        messages: messages,
        stream: true,
        temperature: 0.6,
        top_p: 0.9,
        max_tokens: 2048,
        thinking: { type: "disabled" },
      }),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      throw new Error("API " + res.status + " " + errText.slice(0, 200));
    }

    removeTyping();
    const bubble = addMsg("bot", "");
    bubble.innerHTML = '<div class="typing"><span></span><span></span><span></span></div>';

    const reader = res.body.getReader();
    const decoder = new TextDecoder("utf-8");
    let buffer = "";
    let fullText = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const parts = buffer.split("\n");
      buffer = parts.pop();

      for (const part of parts) {
        const line = part.trim();
        if (!line || !line.startsWith("data:")) continue;
        const data = line.slice(5).trim();
        if (data === "[DONE]") continue;
        try {
          const json = JSON.parse(data);
          const delta = json.choices?.[0]?.delta?.content || "";
          if (delta) {
            fullText += delta;
            bubble.innerHTML = renderMarkdown(fullText);
            chatMessages.scrollTop = chatMessages.scrollHeight;
          }
        } catch (_) {}
      }
    }

    if (!fullText) {
      bubble.innerHTML = "<p>I apologize — I couldn't generate a response at this moment. Please try rephrasing your question.</p>";
      fullText = "I apologize — I couldn't generate a response at this moment.";
    }
    messages.push({ role: "assistant", content: fullText });
  } catch (err) {
    removeTyping();
    const bubble = addMsg("bot", "");
    bubble.innerHTML =
      "<p><strong>Connection issue.</strong> The certification advisor is temporarily unavailable. " +
      "Please check your network and try again, or email " +
      "<code>accreditation@gfaac.global</code> for direct assistance.</p>" +
      "<p style='font-size:0.78rem;opacity:0.5;margin-top:10px;'>Details: " +
      String(err.message).replace(/</g, "&lt;") + "</p>";
  } finally {
    isResponding = false;
    chatSend.disabled = false;
    chatInput.focus();
  }
}

/* ---------- Events ---------- */
chatForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const text = chatInput.value;
  if (!text.trim()) return;
  chatInput.value = "";
  sendChat(text);
});

document.querySelectorAll(".suggest-chip").forEach((chip) => {
  chip.addEventListener("click", () => {
    const q = chip.dataset.q;
    chatInput.value = q;
    sendChat(q);
  });
});
