type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const PREFIX = 'PHX';
const isDebug = () => process.env.NODE_ENV !== 'production' || process.env.PHX_DEBUG === '1';

function fmt(level: LogLevel, scope: string, msg: string, meta?: unknown) {
  const ts = new Date().toISOString();
  const line = `[${PREFIX}] ${ts} ${level.toUpperCase()} ${scope} - ${msg}`;
  return meta === undefined ? line : `${line} :: ${safeSerialize(meta)}`;
}

function safeSerialize(meta: unknown) {
  try {
    return typeof meta === 'string' ? meta : JSON.stringify(meta);
  } catch {
    return '[unserializable-meta]';
  }
}

export const logger = {
  debug(scope: string, msg: string, meta?: unknown) {
    if (!isDebug()) return;
    // eslint-disable-next-line no-console
    console.debug(fmt('debug', scope, msg, meta));
  },
  info(scope: string, msg: string, meta?: unknown) {
    // eslint-disable-next-line no-console
    console.log(fmt('info', scope, msg, meta));
  },
  warn(scope: string, msg: string, meta?: unknown) {
    // eslint-disable-next-line no-console
    console.warn(fmt('warn', scope, msg, meta));
  },
  error(scope: string, msg: string, meta?: unknown) {
    // eslint-disable-next-line no-console
    console.error(fmt('error', scope, msg, meta));
  },
};



