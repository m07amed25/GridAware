import { inspect } from 'node:util';
import type { LogLevel } from '@nestjs/common';

const CONTEXT_COLUMN_WIDTH = 20;
const MAX_OBJECT_DEPTH = 5;
const MAX_ARRAY_ITEMS = 20;

/**
 * Total visible prefix width before the `[Context]` column:
 * `HH:mm:ss.SSS` (12) + ` ` (1) + ` LEVEL ` (7) + ` ` (1) = 21.
 * Metadata and stack trace gutter lines (`│`) align directly beneath `[Context]`.
 */
const GUTTER_INDENT = ' '.repeat(21);

const ANSI = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
  boldRed: '\x1b[1;31m',
  boldGreen: '\x1b[1;32m',
  boldYellow: '\x1b[1;33m',
  boldCyan: '\x1b[1;36m',
  boldWhiteOnRed: '\x1b[1;37;41m',
} as const;

function style(text: string, code: string, colors: boolean): string {
  return colors ? `${code}${text}${ANSI.reset}` : text;
}

export function formatClockTimestamp(date: Date = new Date()): string {
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  const ms = String(date.getMilliseconds()).padStart(3, '0');
  return `${hours}:${minutes}:${seconds}.${ms}`;
}

export function formatLevelBadge(level: LogLevel, colors: boolean): string {
  switch (level) {
    case 'fatal':
      return style(' FATAL ', ANSI.boldWhiteOnRed, colors);
    case 'error':
      return style(' ERROR ', ANSI.boldRed, colors);
    case 'warn':
      return style(' WARN  ', ANSI.boldYellow, colors);
    case 'debug':
      return style(' DEBUG ', ANSI.boldCyan, colors);
    case 'verbose':
      return style(' VERB  ', ANSI.gray, colors);
    case 'log':
    default:
      return style(' INFO  ', ANSI.boldGreen, colors);
  }
}

export function formatContextTag(
  context: string | undefined,
  colors: boolean,
): string {
  if (!context) {
    return '';
  }
  const bracketed = `[${context}]`;
  const padded =
    bracketed.length < CONTEXT_COLUMN_WIDTH
      ? bracketed.padEnd(CONTEXT_COLUMN_WIDTH, ' ')
      : `${bracketed} `;
  return style(padded, ANSI.cyan, colors);
}

interface HttpLogParams {
  method: string;
  path: string;
  statusCode: number;
  durationMs: number;
  requestId?: string;
  correlationId?: string;
  ip?: string;
  userAgent?: string;
  [key: string]: unknown;
}

function isHttpLogParams(
  context: string | undefined,
  params: Record<string, unknown> | undefined,
): params is HttpLogParams {
  return (
    context === 'HTTP' &&
    params !== undefined &&
    typeof params.method === 'string' &&
    typeof params.path === 'string' &&
    typeof params.statusCode === 'number' &&
    typeof params.durationMs === 'number'
  );
}

function formatHttpMethod(method: string, colors: boolean): string {
  const upper = method.toUpperCase();
  const padded = upper.padEnd(6, ' ');
  switch (upper) {
    case 'GET':
      return style(padded, ANSI.boldCyan, colors);
    case 'POST':
      return style(padded, ANSI.boldGreen, colors);
    case 'PUT':
    case 'PATCH':
      return style(padded, ANSI.boldYellow, colors);
    case 'DELETE':
      return style(padded, ANSI.boldRed, colors);
    default:
      return style(padded, ANSI.magenta, colors);
  }
}

function formatHttpStatus(statusCode: number, colors: boolean): string {
  const text = String(statusCode);
  if (statusCode >= 500) {
    return style(text, ANSI.boldRed, colors);
  }
  if (statusCode >= 400) {
    return style(text, ANSI.boldYellow, colors);
  }
  if (statusCode >= 300) {
    return style(text, ANSI.cyan, colors);
  }
  return style(text, ANSI.green, colors);
}

function formatDuration(durationMs: number, colors: boolean): string {
  const formatted =
    durationMs >= 1000
      ? `${(durationMs / 1000).toFixed(2)}s`
      : `${durationMs}ms`;
  if (durationMs >= 2000) {
    return style(formatted, ANSI.boldRed, colors);
  }
  if (durationMs >= 500) {
    return style(formatted, ANSI.yellow, colors);
  }
  return style(formatted, ANSI.gray, colors);
}

function formatHttpSummary(
  params: HttpLogParams,
  colors: boolean,
): {
  headline: string;
  details: Record<string, unknown> | undefined;
} {
  const parts = [
    `${formatHttpMethod(params.method, colors)} ${params.path}`,
    formatHttpStatus(params.statusCode, colors),
    formatDuration(params.durationMs, colors),
  ];

  if (typeof params.requestId === 'string' && params.requestId.length > 0) {
    parts.push(style(`req=${params.requestId}`, ANSI.gray, colors));
  }

  const headline = parts.join('  ');

  // Keep 2xx/3xx HTTP logs crisp on a single line; expand diagnostics on 4xx/5xx.
  const isErrorResponse = params.statusCode >= 400;
  const omittedKeys = new Set<string>([
    'method',
    'path',
    'statusCode',
    'durationMs',
    'requestId',
  ]);
  if (!isErrorResponse) {
    omittedKeys.add('correlationId');
    omittedKeys.add('ip');
    omittedKeys.add('userAgent');
  }

  const remaining: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(params)) {
    if (!omittedKeys.has(key) && value !== undefined) {
      remaining[key] = value;
    }
  }

  return {
    headline,
    details: Object.keys(remaining).length > 0 ? remaining : undefined,
  };
}

function formatMessageText(
  message: unknown,
  logLevel: LogLevel,
  colors: boolean,
): string {
  const text =
    typeof message === 'string'
      ? message
      : message instanceof Error
        ? `${message.name}: ${message.message}`
        : formatInlineValue(message, colors, 0, new Set());

  switch (logLevel) {
    case 'fatal':
    case 'error':
      return style(text, ANSI.red, colors);
    case 'warn':
      return style(text, ANSI.yellow, colors);
    case 'debug':
    case 'verbose':
      return style(text, ANSI.dim, colors);
    case 'log':
    default:
      return text;
  }
}

function formatScalar(value: unknown, colors: boolean): string {
  if (value === null) {
    return style('null', ANSI.gray, colors);
  }
  if (value === undefined) {
    return style('undefined', ANSI.gray, colors);
  }
  if (typeof value === 'boolean') {
    return style(String(value), ANSI.cyan, colors);
  }
  if (typeof value === 'number' || typeof value === 'bigint') {
    return style(String(value), ANSI.yellow, colors);
  }
  if (typeof value === 'string') {
    if (value === '[REDACTED]') {
      return style(value, ANSI.magenta, colors);
    }
    if (value.length === 0) {
      return style('""', ANSI.gray, colors);
    }
    return value;
  }
  if (value instanceof Date) {
    return style(value.toISOString(), ANSI.magenta, colors);
  }
  if (value instanceof Error) {
    return style(`${value.name}: ${value.message}`, ANSI.red, colors);
  }
  if (typeof value === 'symbol') {
    return style(value.toString(), ANSI.magenta, colors);
  }
  return inspect(value, {
    depth: 2,
    colors,
    compact: true,
    breakLength: Infinity,
  });
}

function isSimpleScalar(value: unknown): boolean {
  return (
    value === null ||
    value === undefined ||
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean' ||
    typeof value === 'bigint' ||
    value instanceof Date ||
    value instanceof Error
  );
}

function formatInlineValue(
  value: unknown,
  colors: boolean,
  depth: number,
  seen: Set<unknown>,
): string {
  if (isSimpleScalar(value)) {
    return formatScalar(value, colors);
  }
  if (seen.has(value)) {
    return style('[Circular]', ANSI.gray, colors);
  }
  if (depth >= MAX_OBJECT_DEPTH) {
    return style('[Truncated]', ANSI.gray, colors);
  }

  seen.add(value);
  try {
    if (Array.isArray(value)) {
      if (value.length === 0) {
        return style('[]', ANSI.gray, colors);
      }
      const items = value
        .slice(0, MAX_ARRAY_ITEMS)
        .map((item) => formatInlineValue(item, colors, depth + 1, seen));
      if (value.length > MAX_ARRAY_ITEMS) {
        items.push(
          style(`… +${value.length - MAX_ARRAY_ITEMS} more`, ANSI.gray, colors),
        );
      }
      return `[${items.join(', ')}]`;
    }

    const entries = Object.entries(value as Record<string, unknown>);
    if (entries.length === 0) {
      return style('{}', ANSI.gray, colors);
    }
    const formatted = entries.map(
      ([k, v]) =>
        `${style(k, ANSI.gray, colors)}: ${formatInlineValue(v, colors, depth + 1, seen)}`,
    );
    return `{ ${formatted.join(', ')} }`;
  } finally {
    seen.delete(value);
  }
}

function formatEntryLines(
  record: Record<string, unknown>,
  colors: boolean,
  indentLevel: number,
  seen: Set<unknown>,
): string[] {
  const lines: string[] = [];
  const bar = style('│', ANSI.gray, colors);
  const innerIndent = '  '.repeat(indentLevel);

  for (const [key, value] of Object.entries(record)) {
    if (value === undefined) {
      continue;
    }

    const styledKey = style(`${key}:`, ANSI.gray, colors);

    if (typeof value === 'string' && value.includes('\n')) {
      const stringLines = value.split(/\r?\n/);
      lines.push(
        `${GUTTER_INDENT}${bar} ${innerIndent}${styledKey} ${stringLines[0]}`,
      );
      for (const extraLine of stringLines.slice(1)) {
        lines.push(
          `${GUTTER_INDENT}${bar} ${innerIndent}  ${extraLine}`,
        );
      }
      continue;
    }

    if (isSimpleScalar(value)) {
      lines.push(
        `${GUTTER_INDENT}${bar} ${innerIndent}${styledKey} ${formatScalar(value, colors)}`,
      );
      continue;
    }

    if (seen.has(value)) {
      lines.push(
        `${GUTTER_INDENT}${bar} ${innerIndent}${styledKey} ${style('[Circular]', ANSI.gray, colors)}`,
      );
      continue;
    }

    if (indentLevel >= MAX_OBJECT_DEPTH) {
      lines.push(
        `${GUTTER_INDENT}${bar} ${innerIndent}${styledKey} ${style('[Truncated]', ANSI.gray, colors)}`,
      );
      continue;
    }

    seen.add(value);
    try {
      if (Array.isArray(value)) {
        const allScalars = value.every(isSimpleScalar);
        if (value.length === 0 || (allScalars && value.length <= 6)) {
          lines.push(
            `${GUTTER_INDENT}${bar} ${innerIndent}${styledKey} ${formatInlineValue(value, colors, indentLevel, seen)}`,
          );
        } else {
          lines.push(`${GUTTER_INDENT}${bar} ${innerIndent}${styledKey}`);
          const slice = value.slice(0, MAX_ARRAY_ITEMS);
          for (const item of slice) {
            if (isSimpleScalar(item)) {
              lines.push(
                `${GUTTER_INDENT}${bar} ${innerIndent}  - ${formatScalar(item, colors)}`,
              );
            } else if (typeof item === 'object' && item !== null) {
              lines.push(
                `${GUTTER_INDENT}${bar} ${innerIndent}  - ${formatInlineValue(item, colors, indentLevel + 1, seen)}`,
              );
            }
          }
          if (value.length > MAX_ARRAY_ITEMS) {
            lines.push(
              `${GUTTER_INDENT}${bar} ${innerIndent}  ${style(`… +${value.length - MAX_ARRAY_ITEMS} more`, ANSI.gray, colors)}`,
            );
          }
        }
        continue;
      }

      const nested = value as Record<string, unknown>;
      const nestedEntries = Object.entries(nested).filter(
        ([, v]) => v !== undefined,
      );
      if (nestedEntries.length === 0) {
        lines.push(
          `${GUTTER_INDENT}${bar} ${innerIndent}${styledKey} ${style('{}', ANSI.gray, colors)}`,
        );
      } else {
        lines.push(`${GUTTER_INDENT}${bar} ${innerIndent}${styledKey}`);
        lines.push(
          ...formatEntryLines(nested, colors, indentLevel + 1, seen),
        );
      }
    } finally {
      seen.delete(value);
    }
  }

  return lines;
}

export function formatParamsBlock(
  params: Record<string, unknown>,
  colors: boolean,
): string {
  const seen = new Set<unknown>([params]);
  const lines = formatEntryLines(params, colors, 0, seen);
  return lines.length > 0 ? `\n${lines.join('\n')}` : '';
}

function isVendorStackFrame(line: string): boolean {
  return (
    line.includes('node_modules') ||
    line.includes('node:internal') ||
    line.includes('(node:')
  );
}

export function formatStackTrace(stack: string, colors: boolean): string {
  const rawLines = stack.split(/\r?\n/).filter((line) => line.trim().length > 0);
  if (rawLines.length === 0) {
    return '';
  }

  const bar = style('│', ANSI.gray, colors);
  const formatted = rawLines.map((line) => {
    const trimmed = line.trim();
    if (trimmed.startsWith('at ')) {
      const styledFrame = isVendorStackFrame(trimmed)
        ? style(`  ${trimmed}`, ANSI.gray, colors)
        : `  ${trimmed}`;
      return `${GUTTER_INDENT}${bar} ${styledFrame}`;
    }
    return `${GUTTER_INDENT}${bar} ${style(trimmed, ANSI.boldRed, colors)}`;
  });

  return `${formatted.join('\n')}\n`;
}

export interface PrettyLogInput {
  readonly logLevel: LogLevel;
  readonly message: unknown;
  readonly context?: string;
  readonly params?: Record<string, unknown>;
  readonly traceContext?: {
    readonly requestId: string;
    readonly correlationId: string;
  };
  readonly timestamp?: string;
  readonly timestampDiff?: string;
  readonly colors: boolean;
}

export function formatPrettyLogEntry(input: PrettyLogInput): string {
  const {
    logLevel,
    message,
    context,
    params,
    traceContext,
    timestampDiff,
    colors,
  } = input;

  const clock = style(input.timestamp ?? formatClockTimestamp(), ANSI.gray, colors);
  const levelBadge = formatLevelBadge(logLevel, colors);
  const contextTag = formatContextTag(context, colors);
  const diffSuffix = timestampDiff ? style(timestampDiff, ANSI.gray, colors) : '';

  if (isHttpLogParams(context, params)) {
    const { headline, details } = formatHttpSummary(params, colors);
    const detailsBlock = details ? formatParamsBlock(details, colors) : '';
    return `${clock} ${levelBadge} ${contextTag}${headline}${diffSuffix}${detailsBlock}\n`;
  }

  const messageText = formatMessageText(message, logLevel, colors);

  // When a service emits a simple log inside a request with no structured params,
  // append a compact dimmed trace suffix instead of expanding a multi-line block.
  const hasCallerParams = params !== undefined && Object.keys(params).length > 0;
  if (!hasCallerParams) {
    let traceSuffix = '';
    if (traceContext) {
      const parts = [`req=${traceContext.requestId}`];
      if (traceContext.correlationId !== traceContext.requestId) {
        parts.push(`cor=${traceContext.correlationId}`);
      }
      traceSuffix = `  ${style(parts.join(' '), ANSI.gray, colors)}`;
    }
    return `${clock} ${levelBadge} ${contextTag}${messageText}${traceSuffix}${diffSuffix}\n`;
  }

  const mergedParams: Record<string, unknown> = traceContext
    ? {
        ...params,
        requestId: params.requestId ?? traceContext.requestId,
        correlationId: params.correlationId ?? traceContext.correlationId,
      }
    : params;

  const paramsBlock = formatParamsBlock(mergedParams, colors);
  return `${clock} ${levelBadge} ${contextTag}${messageText}${diffSuffix}${paramsBlock}\n`;
}
