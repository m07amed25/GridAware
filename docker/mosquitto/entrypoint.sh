#!/bin/sh
set -eu

CONF="/tmp/mosquitto.conf"
PASSWD="${MOSQUITTO_PASSWD_FILE:-/tmp/mosquitto.passwd}"
ACL="${MOSQUITTO_ACL_FILE:-/tmp/mosquitto.acl}"
ALLOW_ANONYMOUS="${MQTT_ALLOW_ANONYMOUS:-false}"

case "$ALLOW_ANONYMOUS" in
  true|false) ;;
  *)
    echo "ERROR: MQTT_ALLOW_ANONYMOUS must be true or false." >&2
    exit 1
    ;;
esac

tr -d '\r' < /mosquitto/config/mosquitto.conf > "$CONF"
chmod 0644 "$CONF"

if [ -n "${MQTT_USERNAME:-}" ] && [ -n "${MQTT_PASSWORD:-}" ]; then
  case "$MQTT_USERNAME" in
    -*|*[[:space:]]*)
      echo "ERROR: MQTT_USERNAME must not start with '-' or contain whitespace." >&2
      exit 1
      ;;
  esac
  if [ "$ALLOW_ANONYMOUS" = "true" ]; then
    echo "ERROR: MQTT_ALLOW_ANONYMOUS cannot be true when MQTT credentials are set." >&2
    exit 1
  fi
elif [ -n "${MQTT_USERNAME:-}" ] || [ -n "${MQTT_PASSWORD:-}" ]; then
  echo "ERROR: Both MQTT_USERNAME and MQTT_PASSWORD must be set together." >&2
  exit 1
fi

if [ -z "${MOSQUITTO_ACL_FILE:-}" ]; then
  if [ -n "${MQTT_USERNAME:-}" ]; then
    printf 'user %s\ntopic readwrite gridaware/#\ntopic read $SYS/broker/uptime\n' "$MQTT_USERNAME" > "$ACL"
  elif [ "$ALLOW_ANONYMOUS" = "true" ]; then
    printf 'topic readwrite #\ntopic read $SYS/broker/uptime\n' > "$ACL"
  else
    : > "$ACL"
  fi
elif [ ! -f "$ACL" ]; then
  touch "$ACL"
fi
chown mosquitto:mosquitto "$ACL" 2>/dev/null || true
chmod 0600 "$ACL" 2>/dev/null || true

if [ -n "${MQTT_USERNAME:-}" ]; then
  if [ -f "$PASSWD" ]; then
    mosquitto_passwd -b "$PASSWD" "$MQTT_USERNAME" "$MQTT_PASSWORD"
  else
    mosquitto_passwd -c -b "$PASSWD" "$MQTT_USERNAME" "$MQTT_PASSWORD"
  fi
  chown mosquitto:mosquitto "$PASSWD"
  chmod 0700 "$PASSWD"
  printf '\nallow_anonymous false\npassword_file %s\nacl_file %s\n' "$PASSWD" "$ACL" >> "$CONF"
elif [ "$ALLOW_ANONYMOUS" = "true" ]; then
  printf '\nallow_anonymous true\nacl_file %s\n' "$ACL" >> "$CONF"
else
  printf '\nallow_anonymous false\nacl_file %s\n' "$ACL" >> "$CONF"
fi

exec /docker-entrypoint.sh /usr/sbin/mosquitto -c "$CONF"
