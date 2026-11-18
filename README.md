# Minecraft stress-test CLI

A small interactive command-line tool that connects Mineflayer bots to a private Minecraft clone, authenticates them with your server's register/login plugin, and moves them around an event area.

## Install

Install Node.js 20 or newer and npm, then run:

```sh
npm install
```

`package.json` is marked private and exists only to install the CLI's runtime dependency. This project is meant to be run as a command-line tool, not published as an npm package.

## Configure the login commands

Edit `login-commands.json` to match the messages and commands used by your authentication plugin. The default commands are:

```text
/register <password> <password>
/login <password>
```

Keep `{password}` in the command templates. The CLI asks for the shared bot password without echoing it, or reads it from `MC_LOADTEST_PASSWORD`. The password is not written to the command file or printed to the terminal. The chosen command is sent 3 seconds after each bot spawns to let the server finish initializing the connection.

## Run

```sh
./mc-loadtest
```

The CLI asks for bot count (default 20), target IP (optionally with a port; default 25565), and whether to log in existing accounts (L) or register new accounts (R), displays the target, then requires you to type `YES` before it connects. It defaults to Minecraft 26.3, creates usernames `LoadBot001`, `LoadBot002`, and so on, connects at one bot per second, authenticates, and has the bots walk around their spawn area. Press Ctrl-C to disconnect them and stop.

This uses the third-party `@wp2508/mineflayer` fork because it claims Minecraft 26.3 support. Verify one bot can connect, authenticate, and move on your isolated clone before running a larger group. The fork and the full workflow have not been integration-tested here.

## Safety

Run this only against an isolated copy of a server you administer. Confirm the IP shown by the CLI is the clone before typing `YES`. Use a separate authentication database and a disposable bot password. The server must be configured for offline-mode registration and have enough player slots for the test.
