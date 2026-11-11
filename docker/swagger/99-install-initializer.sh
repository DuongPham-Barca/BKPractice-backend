#!/bin/sh
set -eu

# The image configures its stock initializer first. Install ours afterward.
cp /opt/bkpractice/swagger-initializer.js /usr/share/nginx/html/swagger-initializer.js
