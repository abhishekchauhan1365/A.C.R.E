# A.C.R.E.

> **Autonomous Crash Remediation Engine** — cross-platform incident monitoring and risk-gated remediation from your terminal.

[![npm version](https://img.shields.io/npm/v/acre-ai?color=cb3837&label=npm)](https://www.npmjs.com/package/acre-ai)
[![Node.js](https://img.shields.io/node/v/acre-ai?color=339933&label=node)](https://nodejs.org/)
[![license](https://img.shields.io/npm/l/acre-ai?color=blue)](LICENSE)

A.C.R.E. watches the logs you choose, captures incident context, uses Groq-powered AI when configured, and keeps every proposed action behind a clear safety model. It runs on Windows, macOS, and Linux with Node.js 18 or newer.

## Install

```bash
npm install -g acre-ai
```

## Run the website locally

The website is a separate local control-server application with account signup, login, and a SQLite user store. It is not required by the npm CLI.

```bash
cd backend
copy .env.example .env
# Set a long, random JWT_SECRET in .env (and optionally GROQ_API_KEY)
npm install
cd ../frontend && npm install && npm run build
cd ../backend && npm start
```

Open `http://127.0.0.1:8000`, create an account, and sign in. For frontend development, run `npm run dev` inside `frontend`; Vite proxies `/api` requests to the backend.

## Quick start

```bash
acre-ai init
acre-ai doctor
acre-ai start
acre-ai status
```

`init` asks for a project name, operating system, absolute log path, framework, optional restart command, Groq settings, and notification webhooks. Configuration is saved per machine under `~/.acre`.

Open the local visual control plane at any time:

```bash
acre-ai dashboard
```

It displays the daemon's real projects, incidents, log context, AI recommendations, system metrics, and remediation-plan approvals at `http://127.0.0.1:4310`.

For a detected incident, the dashboard can generate a bounded source patch, show the exact search/replace diff, apply it only after the local user reviews it, validate it with an optional project command, and roll it back from a local backup. Patch targets are restricted to the configured project root; secrets, dependencies, lockfiles, and deployment configuration are blocked.

## What it does

1. Watches your configured log files with cross-platform file monitoring.
2. Detects error-like events and captures recent surrounding logs.
3. Records the project, timestamp, operating system, runtime/framework, and incident history locally.
4. Sends only relevant incident context to Groq when an API key and model are configured.
5. Classifies proposed actions as **low**, **medium**, or **high** risk.
6. Runs automatic remediation only for validated low-risk restart commands when Auto-Fix is enabled.

High-risk operations—such as editing configuration, changing environment variables, or deleting files—always require approval.

## Commands

| Command | Description |
| --- | --- |
| `acre-ai init` | Configure A.C.R.E. and add the first project. |
| `acre-ai login` | Save or replace the encrypted Groq API key. |
| `acre-ai config` | Show safe configuration with secrets redacted. |
| `acre-ai add-project` | Register another application or service. |
| `acre-ai remove-project <id>` | Remove a monitored project. |
| `acre-ai list-projects` | List all configured projects. |
| `acre-ai start [--foreground]` | Start monitoring in the background or terminal. |
| `acre-ai stop` / `restart` | Manage the local daemon. |
| `acre-ai status` / `logs` | Review health, incidents, and audit events. |
| `acre-ai doctor` | Validate log paths and required configuration. |
| `acre-ai dashboard` | Open a locally hosted dashboard. |
| `acre-ai update` | Show the command to install the latest release. |

## Security

- Groq API keys are encrypted locally with AES-256-GCM.
- `acre-ai config` never prints stored secrets.
- Use `GROQ_API_KEY` or `ACRE_MASTER_KEY` environment variables when preferred.
- A.C.R.E. does not scan arbitrary folders or transmit logs unless a monitored incident is detected and AI analysis is configured.

## Supported project types

The bundled plugin registry supports generic logs plus Node.js, Python, Java, NGINX, Docker, Redis, and PM2 profiles. Each project is configured independently, so one installation can monitor multiple applications.

## Development

```bash
npm install
npm run lint
npm pack --dry-run
```

## License

[MIT](LICENSE)
