# Minecraft load test CLI

A command-line Minecraft clone load tester with a local monitoring dashboard. It can connect idle bots in chat-only mode, or run `/login` and `/register` checks with a shared test password. The dashboard shows each bot's connection state and the incoming chat it receives.

This is a private tool, not an npm package. `package.json` only installs the runtime dependency.

## Install

Use Node.js 20 or newer:

```sh
npm install
```

## Dashboard

Start the local dashboard:

```sh
npm run ui
```

Open the printed `http://127.0.0.1:8787` address in a browser. The page is bound to loopback, so it is available only on the computer running the tool. To use it from another computer, forward the port over SSH:

```sh
ssh -L 8787:127.0.0.1:8787 user@machine-running-the-tool
```

Then open `http://127.0.0.1:8787` on your computer. Set a different local port with `MC_LOADTEST_UI_PORT=8788 npm run ui`.

Choose a bot count (default 20), enter a clone server address, select a mode, and type `YES` to start. The dashboard connects at one bot per second and lets you stop the run. It displays connection attempts, reconnects, per-bot status, ping, incoming server chat, authentication events, and chat test markers.

### Modes

- **Chat only:** skips authentication, waits three seconds after spawn, then sends `LoadTest: LoadBotNNN chat test` once per bot.
- **Login:** sends `/login <password>` three seconds after spawn.
- **Register:** sends `/register <password> <password>` three seconds after spawn.

The login and register templates and the success/failure message patterns are read from `login-commands.json`. Use `{password}` in command templates. A hidden password field accepts the shared test password, keeps it in memory for the run, and clears the browser field after the run starts. Passwords are not included in the dashboard activity or chat feed; matching text in incoming server messages is replaced with `[hidden]`.

The dashboard reports a bot as authenticated only when an incoming message matches the configured `success` pattern. If your auth plugin uses different wording, its messages remain visible in **Incoming chat** so you can tune `login-commands.json`. A bot that cannot connect, spawn, or authenticate retries up to five times, with a growing delay between attempts.

## CLI

Run the chat-only diagnostic without the dashboard:

```sh
./mc-loadtest
```

It asks for bot count (default 20) and a target, then requires `YES` before connecting. It prints incoming messages and connection failures in the terminal. Press Ctrl-C to disconnect the bots.

## Server addresses

Both modes accept an IPv4 or IPv6 address, a domain name, or a hostname with an explicit port:

```text
192.0.2.10
192.0.2.10:25570
play.example.net
play.example.net:25570
[2001:db8::10]:25570
```

For a domain without a port, the tool looks up `_minecraft._tcp.<domain>` and uses the selected SRV record's target and port. If no SRV record exists, it falls back to port 25565 on that domain. An explicitly entered port always takes precedence over SRV.

## Runtime note

The tool uses the third-party `@wp2508/mineflayer` fork because it claims Minecraft 26.3 support. It connects with offline-style bot usernames such as `LoadBot001`. Verify the selected protocol and chat behavior against your clone before running a large group.

## Safety

Use this only on an isolated copy of a server you administer. The confirmation prompt is there to reduce accidental connections; it does not verify server ownership. Use a separate authentication database and enough player slots for the run. Do not reuse a personal account password.
