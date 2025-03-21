#!/usr/bin/env bash
# Build script for Render

# Install dependencies including dev dependencies
npm install

# Make sure bcrypt is installed explicitly
npm install bcrypt

# Build the application
npm run build
