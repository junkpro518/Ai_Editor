# https://github.com/bradautomates/claude-video.git

**الملف الأصلي:** `https:::github.com:bradautomates:claude-video.git.txt`  
**المصدر:** الأرشيف  
**جُلب:** 2026-10-26 عبر GitHub API

---

**المستودع:** claude-video  
**الوصف:** Give Claude the ability to watch any video. /watch downloads, extracts frames, transcribes, hands it all to Claude.  
**الترخيص:** MIT · **نجوم:** 19307 · **وسوم:** []

## README

# /watch

Give an agent video evidence: a URL or local file becomes timestamped frames and a transcript. Install it in Claude Code (the desktop app, VS Code, or a terminal), or use it with Codex and other [Agent Skills](https://agentskills.io) hosts. Native captions come first; optional local WhisperX or Groq/OpenAI transcription handles videos without captions.

## Choose your app

**Using Claude? Run Watch in Claude Code.** Install it through Claude Desktop and use a **Code** session, or add it with the plugin commands in VS Code or a terminal. Watch does **not** work in Claude Chat or Cowork; [see why](#chat-cowork-and-browser-apps).

| Where you use your agent | Start here |
|---|---|
| **Claude Desktop — Code** | [Install through Customize](#claude-desktop--code) — no terminal needed |
| **Codex — desktop app, CLI, or IDE extension** | [Ask Codex to install it](#codex) — no terminal needed |
| **Claude Code in VS Code** | [Use the extension's plugin window](#claude-code-in-vs-code) |
| **Claude Code in a terminal** | [Enter the plugin commands](#claude-code-in-a-terminal) |
| **Cursor, Copilot, or another local agent** | [Use the Skills CLI](#other-local-agents) |
| **Claude Chat, Cowork, or a browser app** | [Chat and Cowork don't work; browser apps have limits](#chat-cowork-and-browser-apps) |

Choose **one installation method** for your agent. If Watch is already installed, go straight to [your first video](#try-your-first-video).

### Claude Desktop — Code

1. Open **Claude Desktop** and click **Customize** in the sidebar.
2. Select **Plugins**, open **Add**, then choose **Add marketplace**.

![Claude Desktop Customize page with Plugins selected and the Add button at the top right](docs/images/install/claude-customize-plugins.png)

3. Choose **Add from a repository**.

![Add marketplace dialog with the Add from a repository option](docs/images/install/claude-add-repository.png)

4. In **URL**, paste the address below. If a picker opens, paste into its search field and select **Use** for that URL. Click **Sync**.

```text
https://github.com/bradautomates/claude-video
```

![Marketplace URL form filled with the public claude-video GitHub address and a Sync button](docs/images/install/claude-marketplace-url.png)

5. Find **Watch** in the added marketplace and install it. Adding the marketplace alone does not install Watch.
6. Start a **Code** session and ask it to use the watch skill. Watch does not work in Cowork tasks ([why](#chat-cowork-and-browser-apps)). Continue with [your first video](#try-your-first-video).

If you do not see these controls, update Claude Desktop. On a managed account, your administrator may control which plugins you can add. See the [official plugin guide](https://claude.com/docs/cowork/guide/plugins).

*Screenshots show the installation controls only. Labels may vary slightly by app version.*

### Codex

**Paste this into Codex's message box** in the desktop app, CLI, or IDE extension:

```text
Use $skill-installer to install the watch skill from:
https://github.com/bradautomates/claude-video/tree/main/skills/watch
```

Let Codex finish the installation, then start a new turn or session and ask it to use **watch**. If the skill does not appear, restart Codex. You do not need Node/npm for this route. See [OpenAI's skill installation guide](https://learn.chatgpt.com/docs/build-skills#install-curated-skills-for-local-use).

<details>
<summary>Alternative: native Codex plugin installation (desktop and CLI)</summary>

If you already have the Codex CLI installed, run these **in your computer's terminal**, one at a time:

```bash
codex plugin marketplace add bradautomates/claude-video
codex plugin add watch@claude-video
```

Start a new Codex session afterward. You can inspect the result with:

```bash
codex plugin list --marketplace claude-video
```

The desktop Plugins directory and CLI `/plugins` browser also show configured marketplaces. The IDE extension currently supports standalone skills, **no
