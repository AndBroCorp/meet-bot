meet-bot - Google meet bot
==========================

A puppeteer script to automatically join a google meet room from an unattended
linux computer. Settings like mic mute and layout can be controlled by typing
commands in the built in meet chat.

## Features

- Logs in automatically
- Restarts if the meeting crashes
- Logs back in if the session expires
- Change layout, pin users, mute/unmute mic/video using chat commands
- Automatically pick layout on start

## Screencast

<<<<<<< HEAD
[![Screencast](https://img.youtube.com/vi/PUk6jNOl1oE/0.jpg)](https//www.youtube.com/watch?v=PUk6jNOl1oE "Screencast")

www.youtube.com/watch?v=PUk6jNOl1oE
=======
[![Screencast](http://img.youtube.com/vi/PUk6jNOl1oE/0.jpg)](http://www.youtube.com/watch?v=PUk6jNOl1oE "Screencast")
>>>>>>> Yargs argv parser

## Requirements

- linux
- google chrome
- git
- node.js
- yarn

## Setup

### Account

1. Create or choose a google account for your bot
2. Set language to english: https://myaccount.google.com/language

### Meeting

If your bot account isn't part of your organization you will need to create a
calendar event with the following options to grant access to the meet room:

- Start date: Now
- End date: Far into the future
- Video conferencing: Add and do not change the generated meeting code
- Guests: Your bot account

## Usage
### Running (without installing)

```
npx meet-bot -e example@gmail.com -p password -m abc-asdf-qwe
```

### Running (installed)

```
npm install -g meet-bot
meet-bot -e example@gmail.com -p password -m abc-asdf-qwe
```

### Help

```
npx meet-bot --help
man meet-bot # If installed
```

### Environment variables

Command line options can be replaced with environment variables prefixed with
`MEET_BOT_`:

```sh
env MEET_BOT_PASSWORD=hunter2 npx meet-bot -e example@gmail.com -m abc-asdf-qwe
```

## Chat commands

**/pin <x>**

Pin a participant to the main screen.

Example: `/pin 0` - pin the first participant

**/unpin**

Unpin pinned participant

**/restart**

Restarts chrome

**/help**

Get a list of commands

**/mic**

Turn mic on or off

Example: `/mic on` - Turn mic on
Example: `/mic off` - Turn mic off

**/cam**

Turn camera on or off

Example: `/cam on` - Turn cam on
Example: `/cam off` - Turn cam offup

**/layout**

Set the layout to auto, sidebar, spotlight or tiled.

Example: `/layout spotlight` - Change layout to spotlight

## TODO

- Switch camera / mic device command
- Repeat latest chat messages command
- "Ask to join" (without google account)
