# Subdomain Enumerator

A passive subdomain enumeration tool built with React Native (Expo). Queries multiple public sources, optionally resolves each subdomain to an IP via DNS-over-HTTPS, and stores all jobs locally on-device.

## Features

- **6 passive sources** — crt.sh, HackerTarget, RapidDNS, AlienVault OTX, urlscan.io, VirusTotal (optional API key)
- **DNS resolution** — resolves subdomains to IPs using Cloudflare DoH (`1.1.1.1`)
- **Job history** — all scans persisted in SQLite (native) or localStorage (web); survives app restarts
- **Export** — share live or dead subdomain lists as CSV
- **Web support** — runs in the browser via React Native Web + Metro bundler
- **Dark UI** — portrait-only, dark theme throughout

## Screenshots

| Enumerate | Jobs | Results |
| --------- | ---- | ------- |
| Enter target domain, toggle DNS resolution, optionally add a VirusTotal API key | Live job list with status, progress, and stats | Per-source bar chart, live/dead subdomain lists, CSV export |

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) 18+
- [Expo CLI](https://docs.expo.dev/get-started/installation/)
- Android or iOS device / emulator, **or** a web browser

### Install

```bash
git clone https://github.com/rejRoky/subdomain-scanner-react-native.git
cd subdomain-scanner-react-native
npm install
```

### Run

**Web browser:**

```bash
npx expo start --web
```

Then open [http://localhost:8081](http://localhost:8081) in your browser.

**Mobile:**

```bash
npx expo start
```

Scan the QR code with **Expo Go** on your device, or press `a` for Android emulator / `i` for iOS simulator.

## Data Sources

| Source | Type | Notes |
| ------ | ---- | ----- |
| [crt.sh](https://crt.sh) | Certificate Transparency logs | No key required |
| [HackerTarget](https://hackertarget.com) | Passive DNS | No key required |
| [RapidDNS](https://rapiddns.io) | DNS dataset | No key required |
| [AlienVault OTX](https://otx.alienvault.com) | Open Threat Exchange | No key required |
| [urlscan.io](https://urlscan.io) | Web scan history | No key required |
| [VirusTotal](https://www.virustotal.com) | Threat intelligence | API key required |

## Project Structure

```text
src/
├── navigation/    # Stack + bottom-tab navigator
├── screens/       # HomeScreen, JobsScreen, ResultsScreen
├── services/
│   ├── database.native.ts  # SQLite CRUD via expo-sqlite (iOS/Android)
│   ├── database.web.ts     # localStorage CRUD (web)
│   ├── enumerator.ts       # Orchestrates fetchers + resolver
│   ├── fetchers.ts         # Per-source fetch functions
│   └── resolver.ts         # Concurrent DoH resolution
├── types/         # Shared TypeScript types
└── theme.ts       # Color constants
```

## Tech Stack

- **React Native** 0.76 + **Expo** 52
- **react-native-web** — browser rendering
- **expo-sqlite** — on-device job persistence (native)
- **expo-sharing** — CSV export
- **React Navigation** — bottom tabs + stack
- **TypeScript**

## Author

### Rejaul Islam Roky

- GitHub: [@rejRoky](https://github.com/rejRoky)
- Email: [rejaul.islam.roky@gmail.com](mailto:rejaul.islam.roky@gmail.com)

## Legal

This tool performs **passive reconnaissance only** — it never sends probes or requests directly to the target. Only use it against domains you own or have explicit permission to test.

## License

MIT © 2026 [Rejaul Islam Roky](https://github.com/rejRoky)
