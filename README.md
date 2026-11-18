# Minecraft stress-test CLI

A small interactive command-line tool that connects Mineflayer bots to a private Minecraft clone, authenticates them with your server's register/login plugin, and moves them around an event area.

## Install

Install Node.js 20 or newer and npm, then run:

```sh
npm install
```

`package.json` is marked private and exists only to install the CLI's runtime dependency. This project is meant to be run as a command-line tool, not published as an npm package.

## Configure the login commands

`login-commands.json` keeps register/login command templates for a later authenticated mode. The current chat diagnostic does not read that file. Its default templates are:

```text
/register <password> <password>
/login <password>
```

Keep `{password}` as a placeholder; never put a real password in the file. The current diagnostic skips login/register and sends one plain chat marker from each bot 3 seconds after spawn, to check whether ordinary chat reaches the server.

## Run

```sh
./mc-loadtest
```

The CLI asks for bot count (default 20) and target IP (optionally with a port; default 25565), displays the target, then requires you to type `YES` before it connects. It defaults to Minecraft 26.3, creates usernames `LoadBot001`, `LoadBot002`, and so on, connects at one bot per second, sends each bot a one-time chat marker 3 seconds after spawn, and leaves them stationary for this diagnostic. Press Ctrl-C to disconnect them and stop.

This uses the third-party `@wp2508/mineflayer` fork because it claims Minecraft 26.3 support. Verify the chat marker appears in the server chat for one bot before running a larger group. The fork and the full workflow have not been integration-tested here.

## Safety

Run this only against an isolated copy of a server you administer. Confirm the IP shown by the CLI is the clone before typing `YES`. Use an isolated clone with a separate authentication database and enough player slots for the test. This chat-only diagnostic sends no password.
