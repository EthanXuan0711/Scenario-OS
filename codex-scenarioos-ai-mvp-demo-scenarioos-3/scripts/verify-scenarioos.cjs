const cp = require("child_process");
const crypto = require("crypto");
const fs = require("fs");
const http = require("http");
const net = require("net");
const os = require("os");
const path = require("path");

const chromePath = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const projectRoot = path.resolve(__dirname, "..");
const screenshotPath = path.join(projectRoot, "scenarioos-verified-current.png");
const profileDir = fs.mkdtempSync(path.join(os.tmpdir(), "scenarioos-chrome-"));
const port = 9341;
const targetUrl = process.env.SCENARIOOS_URL || "http://127.0.0.1:3000";

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function httpJson(url) {
  return new Promise((resolve, reject) => {
    http
      .get(url, (res) => {
        let data = "";
        res.setEncoding("utf8");
        res.on("data", (chunk) => {
          data += chunk;
        });
        res.on("end", () => {
          try {
            resolve(JSON.parse(data));
          } catch (error) {
            reject(error);
          }
        });
      })
      .on("error", reject);
  });
}

class CDP {
  constructor(wsUrl) {
    const parsed = new URL(wsUrl);
    this.host = parsed.hostname;
    this.port = Number(parsed.port);
    this.path = `${parsed.pathname}${parsed.search}`;
    this.socket = null;
    this.buffer = Buffer.alloc(0);
    this.nextId = 1;
    this.pending = new Map();
  }

  connect() {
    return new Promise((resolve, reject) => {
      const socket = net.createConnection({ host: this.host, port: this.port }, () => {
        const key = crypto.randomBytes(16).toString("base64");
        socket.write(
          [
            `GET ${this.path} HTTP/1.1`,
            `Host: ${this.host}:${this.port}`,
            "Upgrade: websocket",
            "Connection: Upgrade",
            `Sec-WebSocket-Key: ${key}`,
            "Sec-WebSocket-Version: 13",
            "",
            ""
          ].join("\r\n")
        );
      });

      socket.once("error", reject);
      socket.once("data", (chunk) => {
        const text = chunk.toString("utf8");
        const headerEnd = text.indexOf("\r\n\r\n");
        if (!text.startsWith("HTTP/1.1 101") || headerEnd === -1) {
          reject(new Error(`WebSocket handshake failed: ${text.slice(0, 160)}`));
          return;
        }

        this.socket = socket;
        socket.removeAllListeners("error");
        socket.on("error", reject);
        socket.on("data", (data) => this.consume(data));

        const rest = chunk.subarray(headerEnd + 4);
        if (rest.length) this.consume(rest);
        resolve();
      });
    });
  }

  send(method, params = {}) {
    if (!this.socket) throw new Error("CDP socket is not connected");
    const id = this.nextId;
    this.nextId += 1;
    this.socket.write(this.encode(JSON.stringify({ id, method, params })));
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
    });
  }

  encode(text) {
    const payload = Buffer.from(text, "utf8");
    let headerLength = 2;
    if (payload.length >= 126 && payload.length < 65536) headerLength += 2;
    else if (payload.length >= 65536) headerLength += 8;

    const frame = Buffer.alloc(headerLength + 4 + payload.length);
    frame[0] = 0x81;

    if (payload.length < 126) {
      frame[1] = 0x80 | payload.length;
    } else if (payload.length < 65536) {
      frame[1] = 0x80 | 126;
      frame.writeUInt16BE(payload.length, 2);
    } else {
      frame[1] = 0x80 | 127;
      frame.writeBigUInt64BE(BigInt(payload.length), 2);
    }

    const maskOffset = headerLength;
    const mask = crypto.randomBytes(4);
    mask.copy(frame, maskOffset);

    for (let index = 0; index < payload.length; index += 1) {
      frame[maskOffset + 4 + index] = payload[index] ^ mask[index % 4];
    }

    return frame;
  }

  consume(chunk) {
    this.buffer = Buffer.concat([this.buffer, chunk]);
    while (this.buffer.length >= 2) {
      const first = this.buffer[0];
      const second = this.buffer[1];
      const opcode = first & 0x0f;
      const masked = Boolean(second & 0x80);
      let length = second & 0x7f;
      let offset = 2;

      if (length === 126) {
        if (this.buffer.length < offset + 2) return;
        length = this.buffer.readUInt16BE(offset);
        offset += 2;
      } else if (length === 127) {
        if (this.buffer.length < offset + 8) return;
        length = Number(this.buffer.readBigUInt64BE(offset));
        offset += 8;
      }

      const maskLength = masked ? 4 : 0;
      if (this.buffer.length < offset + maskLength + length) return;

      const mask = masked ? this.buffer.subarray(offset, offset + 4) : null;
      offset += maskLength;
      const payload = Buffer.from(this.buffer.subarray(offset, offset + length));
      this.buffer = this.buffer.subarray(offset + length);

      if (mask) {
        for (let index = 0; index < payload.length; index += 1) payload[index] ^= mask[index % 4];
      }

      if (opcode !== 0x1) continue;
      const message = JSON.parse(payload.toString("utf8"));

      if (message.id && this.pending.has(message.id)) {
        const pending = this.pending.get(message.id);
        this.pending.delete(message.id);
        if (message.error) pending.reject(new Error(JSON.stringify(message.error)));
        else pending.resolve(message.result);
      }
    }
  }

  close() {
    if (this.socket) this.socket.destroy();
  }
}

async function main() {
  if (!fs.existsSync(chromePath)) throw new Error(`Chrome not found at ${chromePath}`);

  const chrome = cp.spawn(
    chromePath,
    [
      "--headless=new",
      "--disable-gpu",
      "--no-first-run",
      "--no-default-browser-check",
      `--remote-debugging-port=${port}`,
      `--user-data-dir=${profileDir}`,
      "--window-size=1440,960",
      "about:blank"
    ],
    { stdio: "ignore" }
  );

  try {
    let targets;
    for (let attempt = 0; attempt < 40; attempt += 1) {
      try {
        targets = await httpJson(`http://127.0.0.1:${port}/json/list`);
        if (targets.length) break;
      } catch (_error) {
        // Chrome is still starting.
      }
      await delay(250);
    }

    if (!targets?.length) throw new Error("Chrome CDP target was not available");

    const pageTarget = targets.find((target) => target.type === "page") ?? targets[0];
    const cdp = new CDP(pageTarget.webSocketDebuggerUrl);
    await cdp.connect();
    await cdp.send("Runtime.enable");
    await cdp.send("Page.enable");
    await cdp.send("Page.addScriptToEvaluateOnNewDocument", {
      source: `
        window.__codexErrors = [];
        window.__codexConsole = [];
        const serialize = (value) => {
          if (typeof value === 'string') return value;
          try { return JSON.stringify(value); } catch (_error) { return String(value); }
        };
        for (const level of ['error', 'warn']) {
          const original = console[level];
          console[level] = function (...args) {
            try {
              window.__codexConsole.push({ level, text: args.map(serialize).join(' ') });
            } catch (_error) {
              window.__codexConsole.push({ level, text: 'console capture failed' });
            }
            return original.apply(this, args);
          };
        }
        window.addEventListener('error', (event) => window.__codexErrors.push(event.message));
        window.addEventListener('unhandledrejection', (event) => window.__codexErrors.push(String(event.reason)));
      `
    });

    await cdp.send("Page.navigate", { url: targetUrl });

    async function evaluate(expression) {
      const result = await cdp.send("Runtime.evaluate", {
        expression,
        awaitPromise: true,
        returnByValue: true
      });
      if (result.exceptionDetails) {
        throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
      }
      return result.result.value;
    }

    for (let attempt = 0; attempt < 80; attempt += 1) {
      const ready = await evaluate(
        "Boolean(document.querySelector('[data-testid=\"vault-sidebar\"]')) && Boolean(document.querySelector('[data-testid=\"obsidian-graph\"]')) && Boolean(document.querySelector('canvas'))"
      );
      if (ready) break;
      await delay(250);
    }

    await delay(800);

    async function clickRightTab(label) {
      await evaluate(
        `(() => {
          const tabs = [...document.querySelector('aside').firstElementChild.querySelectorAll('button')];
          const tab = tabs.find((item) => item.innerText.trim() === ${JSON.stringify(label)});
          if (!tab) throw new Error('missing right tab ${label}');
          tab.click();
          return true;
        })()`
      );
      await delay(220);
    }

    async function clickWorkspaceMode(label) {
      await evaluate(
        `(() => {
          const buttons = [...document.querySelector('main header').querySelectorAll('button')];
          const button = buttons.find((item) => item.innerText.trim() === ${JSON.stringify(label)});
          if (!button) throw new Error('missing workspace mode ${label}');
          button.click();
          return true;
        })()`
      );
      await delay(260);
    }

    const initial = await evaluate(`(() => ({
      hasChinese: /[\\u4e00-\\u9fff]/.test(document.body.innerText),
      hasVault: Boolean(document.querySelector('[data-testid="vault-sidebar"]')),
      hasGraphView: Boolean(document.querySelector('[data-testid="obsidian-graph"]')),
      hasCanvas: Boolean(document.querySelector('canvas')),
      rightTabCount: document.querySelector('aside').firstElementChild.querySelectorAll('button').length,
      workspaceModeCount: document.querySelector('main header').querySelectorAll('button').length,
      hasQuickCapture: Boolean(document.querySelector('[data-testid="quick-capture"] input')),
      noteButtonCount: document.querySelector('[data-testid="vault-sidebar"]').querySelectorAll('button').length
    }))()`);

    await evaluate(`(() => {
      const search = document.querySelector('[data-testid="vault-sidebar"] header input');
      search.focus();
      return true;
    })()`);
    await cdp.send("Input.insertText", { text: "现金流" });
    await delay(220);

    await evaluate(`(() => {
      const sidebar = document.querySelector('[data-testid="vault-sidebar"]');
      const button = [...sidebar.querySelectorAll('button')].find((item) => item.innerText.includes('现金流'));
      if (!button) throw new Error('missing cashflow note after search');
      button.click();
      return true;
    })()`);
    await delay(240);

    await clickWorkspaceMode("Markdown");
    await evaluate("window.__codexVisitedMarkdown = Boolean(document.querySelector('[data-testid=\"markdown-note\"]'))");
    await delay(220);

    await clickRightTab("属性");
    await evaluate(`(() => {
      const buttons = [...document.querySelectorAll('aside button')];
      const copyButton = buttons.find((item) => item.innerText.includes('复制 WikiLink'));
      if (!copyButton) throw new Error('missing copy wikilink');
      copyButton.click();
      return true;
    })()`);
    await evaluate("window.__codexVisitedProperties = Boolean(document.querySelector('[data-testid=\"properties-panel\"]'))");
    await delay(220);

    await clickRightTab("反链");
    await evaluate("window.__codexVisitedBacklinks = Boolean(document.querySelector('[data-testid=\"backlinks-panel\"]'))");
    await delay(220);

    await clickWorkspaceMode("局部图谱");
    await evaluate("window.__codexVisitedGraph = Boolean(document.querySelector('[data-testid=\"obsidian-graph\"]'))");
    await delay(260);

    await evaluate(`(() => {
      const capture = document.querySelector('[data-testid="quick-capture"] input');
      capture.focus();
      return true;
    })()`);
    await cdp.send("Input.insertText", { text: "真实用户愿意试用但只接受一个很小的 demo" });
    await evaluate("document.querySelector('[data-testid=\"quick-capture\"] button[type=\"submit\"]').click()");
    await evaluate("window.__codexCapturedNote = document.body.innerText.includes('真实用户愿意试用')");
    await delay(420);

    await clickWorkspaceMode("Canvas");
    await evaluate("window.__codexVisitedCanvas = Boolean(document.querySelector('[data-testid=\"obsidian-canvas\"]'))");
    await delay(260);

    await clickRightTab("变量");
    await evaluate(`(() => {
      const range = document.querySelector('aside input[type="range"]');
      if (!range) throw new Error('missing variable range');
      range.value = '70';
      range.dispatchEvent(new Event('input', { bubbles: true }));
      range.dispatchEvent(new Event('change', { bubbles: true }));
      return true;
    })()`);
    await delay(220);

    await clickRightTab("协议");
    await evaluate(`(() => {
      document.querySelector('aside li button').click();
      document.querySelector('textarea').focus();
      return true;
    })()`);
    await cdp.send("Input.insertText", { text: "backfill smoke test" });
    await evaluate("document.querySelector('textarea').nextElementSibling.click()");
    await evaluate("window.__codexProtocolFlow = Boolean(document.querySelector('aside li button svg')) && Boolean(document.querySelector('textarea'))");
    await delay(260);

    await clickRightTab("反方");
    await evaluate("document.querySelector('aside article button').click()");
    await delay(260);

    await clickRightTab("反链");
    await clickWorkspaceMode("局部图谱");
    await delay(240);

    const after = await evaluate(`(() => {
      const consoleMessages = window.__codexConsole || [];
      const hydrationMessages = consoleMessages.filter((entry) => /hydration|server rendered HTML|didn't match|did not match|mismatch/i.test(entry.text));
      return {
      errors: window.__codexErrors || [],
      consoleMessages,
      hydrationMessages,
      hasChinese: /[\\u4e00-\\u9fff]/.test(document.body.innerText),
      hasVault: Boolean(document.querySelector('[data-testid="vault-sidebar"]')),
      hasGraphView: Boolean(document.querySelector('[data-testid="obsidian-graph"]')),
      visitedGraph: Boolean(window.__codexVisitedGraph),
      visitedMarkdown: Boolean(window.__codexVisitedMarkdown),
      visitedCanvas: Boolean(window.__codexVisitedCanvas),
      visitedProperties: Boolean(window.__codexVisitedProperties),
      visitedBacklinks: Boolean(window.__codexVisitedBacklinks),
      capturedNote: Boolean(window.__codexCapturedNote),
      protocolFlow: Boolean(window.__codexProtocolFlow),
      hasMarkdownNote: Boolean(document.querySelector('[data-testid="markdown-note"]')) || document.body.innerText.includes('YAML Frontmatter'),
      hasObsidianCanvas: Boolean(document.querySelector('[data-testid="obsidian-canvas"]')) || document.body.innerText.includes('Canvas / MOC'),
      hasBacklinksPanel: Boolean(document.querySelector('[data-testid="backlinks-panel"]')),
      hasPropertiesPanel: Boolean(document.querySelector('[data-testid="properties-panel"]')) || document.body.innerText.includes('复制 WikiLink'),
      hasCapturedNote: document.body.innerText.includes('真实用户愿意试用'),
      hasProtocolTextarea: Boolean(document.querySelector('textarea')),
      hasCheckedProtocol: Boolean(document.querySelector('aside li button svg')),
      hasMoc: document.body.innerText.includes('MOC'),
      hasWikiLinks: document.body.innerText.includes('[[') && document.body.innerText.includes(']]'),
      canvas: (() => {
        const canvas = document.querySelector('canvas');
        if (!canvas) return { exists: false };
        return { exists: true, width: canvas.width, height: canvas.height };
      })()
      };
    })()`);

    const screenshot = await cdp.send("Page.captureScreenshot", {
      format: "png",
      captureBeyondViewport: false
    });
    fs.writeFileSync(screenshotPath, Buffer.from(screenshot.data, "base64"));

    cdp.close();

    const checks = {
      hasChinese: initial.hasChinese && after.hasChinese,
      hasVault: initial.hasVault && after.hasVault,
      hasWorkspaceModes: initial.workspaceModeCount === 3,
      hasRightTabs: initial.rightTabCount === 5,
      hasObsidianGraph: initial.hasGraphView && after.visitedGraph,
      hasMarkdownNote: after.visitedMarkdown,
      hasCanvasMoc: after.visitedCanvas && after.hasMoc,
      hasBacklinks: after.visitedBacklinks && after.hasWikiLinks,
      quickCaptureWorks: initial.hasQuickCapture && after.capturedNote,
      hasCanvas: initial.hasCanvas && after.canvas.exists && after.canvas.width > 0 && after.canvas.height > 0,
      protocolFlowWorks: after.protocolFlow,
      propertiesAvailable: after.visitedProperties,
      noRuntimeErrors: after.errors.length === 0 && after.consoleMessages.filter((entry) => entry.level === "error").length === 0,
      noHydrationMismatch: after.hydrationMessages.length === 0
    };

    const failed = Object.entries(checks).filter(([, value]) => !value);
    const result = { checks, initial, after, screenshotPath };
    console.log(JSON.stringify(result, null, 2));

    if (failed.length > 0) {
      throw new Error(`Verification failed: ${failed.map(([key]) => key).join(", ")}`);
    }
  } finally {
    chrome.kill("SIGTERM");
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
