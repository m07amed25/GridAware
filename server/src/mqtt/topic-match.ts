/**
 * MQTT topic filter matching (supports `+`, `#`, and `$share/<group>/` prefixes).
 */
export function stripSharePrefix(filter: string): string {
  if (!filter.startsWith('$share/')) {
    return filter;
  }
  return filter.split('/').slice(2).join('/');
}

export function topicMatches(filter: string, topic: string): boolean {
  const filterLevels = stripSharePrefix(filter).split('/');
  const topicLevels = topic.split('/');

  // Wildcards must not match system topics such as $SYS/...
  if (topic.startsWith('$') && /^[+#]$/.test(filterLevels[0] ?? '')) {
    return false;
  }

  for (let i = 0; i < filterLevels.length; i++) {
    const level = filterLevels[i];
    if (level === '#') {
      return true;
    }
    if (i >= topicLevels.length) {
      return false;
    }
    if (level !== '+' && level !== topicLevels[i]) {
      return false;
    }
  }
  return filterLevels.length === topicLevels.length;
}
