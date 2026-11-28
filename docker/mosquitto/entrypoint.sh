#!/bin/sh
set -eu

CONF="/tmp/mosquitto.conf"
PASSWD="${MOSQUITTO_PASSWD_FILE:-/tmp/mosquitto.passwd}"
ACL="${MOSQUITTO_ACL_FILE:-/tmp/mosquitto.acl}"

tr -d '\r' < /mosquitto/config/mosquitto.conf > "$CONF"
chmod 0644 "$CONF"

if [ ! -f "$ACL" ]; then
  touch "$ACL"
fi
chown mosquitto:mosquitto "$ACL" 2>/dev/null || true
chmod 0644 "$ACL" 2>/dev/null || true

if [ -n "${MQTT_USERNAME:-}" ] && [ -n "${MQTT_PASSWORD:-}" ]; then
  if [ -f "$PASSWD" ]; then
    mosquitto_passwd -b "$PASSWD" "$MQTT_USERNAME" "$MQTT_PASSWORD"
  else
    mosquitto_passwd -c -b "$PASSWD" "$MQTT_USERNAME" "$MQTT_PASSWORD"
  fi
  chown mosquitto:mosquitto "$PASSWD"
  chmod 0700 "$PASSWD"
  printf '\nallow_anonymous false\npassword_file %s\nacl_file %s\n' "$PASSWD" "$ACL" >> "$CONF"
elif [ -n "${MQTT_USERNAME:-}" ] || [ -n "${MQTT_PASSWORD:-}" ]; then
  echo "ERROR: Both MQTT_USERNAME and MQTT_PASSWORD must be set together." >&2
  exit 1
else
  printf '\nallow_anonymous false\nacl_file %s\n' "$ACL" >> "$CONF"
fi

exec /docker-entrypoint.sh /usr/sbin/mosquitto -c "$CONF"
