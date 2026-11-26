import { describe, expect, it } from 'vitest';
import { stripSharePrefix, topicMatches } from './topic-match.js';

describe('topicMatches', () => {
  it.each([
    ['a/b/c', 'a/b/c', true],
    ['a/+/c', 'a/b/c', true],
    ['a/+/c', 'a/b/d', false],
    ['a/#', 'a/b/c', true],
    ['a/#', 'a', true],
    ['a/+', 'a/b/c', false],
    ['a/b/c', 'a/b', false],
    ['$share/grp/a/+/c', 'a/b/c', true],
    ['#', '$SYS/broker/uptime', false],
    ['+/broker/uptime', '$SYS/broker/uptime', false],
    ['$SYS/#', '$SYS/broker/uptime', true],
  ])('filter %s vs topic %s -> %s', (filter, topic, expected) => {
    expect(topicMatches(filter, topic)).toBe(expected);
  });

  it('strips shared subscription prefixes', () => {
    expect(stripSharePrefix('$share/ingest/a/+/b')).toBe('a/+/b');
    expect(stripSharePrefix('a/+/b')).toBe('a/+/b');
  });
});
