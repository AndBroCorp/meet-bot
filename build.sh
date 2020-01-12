#!/bin/bash

node_modules/.bin/tsc
node_modules/.bin/add-shebang
node_modules/.bin/marked-man README.md > dist/meet-bot.1
