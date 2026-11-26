#!/bin/sh
set -eu

CONF="/tmp/mosquitto.conf"
PASSWD="/tmp/mosquitto.passwd"

tr -d '\r' < /mosquitto/config/mosquitto.conf > "$CONF"
chmod 0644 "$CONF"

if [ -n "${MQTT_USERNAME:-}" ] && [ -n "${MQTT_PASSWORD:-}" ]; then
  mosquitto_passwd -c -b "$PASSWD" "$MQTT_USERNAME" "$MQTT_PASSWORD"
  chown mosquitto:mosquitto "$PASSWD"
  chmod 0700 "$PASSWD"
  printf '\nallow_anonymous false\npassword_file %s\n' "$PASSWD" >> "$CONF"
elif [ -n "${MQTT_USERNAME:-}" ] || [ -n "${MQTT_PASSWORD:-}" ]; then
  echo "ERROR: Both MQTT_USERNAME and MQTT_PASSWORD must be set together." >&2
  exit 1
else
  printf '\nallow_anonymous true\n' >> "$CONF"
fi

exec /docker-entrypoint.sh /usr/sbin/mosquitto -c "$CONF"
