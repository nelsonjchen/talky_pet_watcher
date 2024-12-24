#!/usr/bin/env bash

while true
do
  echo "Starting bun index.ts..."
  bun index.ts
  echo "Script exited with status $?; restarting in 1 second."
  sleep 1
done