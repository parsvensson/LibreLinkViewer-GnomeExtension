#!/usr/bin/env bash

# Define the target directory
TARGET_DIR=~/.local/share/gnome-shell/extensions/librelinkviewer@example.com/

# Create the directory if it doesn't exist
mkdir -p "$TARGET_DIR"

# Copy the files to the target directory
cp *.js *.json "$TARGET_DIR"

# Start a nested Wayland session of GNOME Shell
dbus-run-session -- gnome-shell --nested --wayland

