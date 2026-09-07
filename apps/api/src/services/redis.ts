import { createClient } from "redis";

import { env } from "../config.js";

function logRedisError(scope: string, error: unknown) {
  console.error(JSON.stringify({
    event: "redis_error",
    scope,
    message: error instanceof Error ? error.message : String(error),
  }));
}

function createRedisClient() {
  const client = createClient({
    url: env.REDIS_URL,
    socket: {
      connectTimeout: env.REDIS_CONNECT_TIMEOUT_MS,
      reconnectStrategy: (retries) => {
        if (retries >= 10) return new Error("Redis reconnect limit reached");
        return Math.min(100 * 2 ** retries, 1_000);
      },
    },
  });
  client.on("error", (error) => logRedisError("client", error));
  return client;
}

type RedisClient = ReturnType<typeof createRedisClient>;

let commandClient: RedisClient | undefined;
let subscriberClient: RedisClient | undefined;

export async function initializeRedis() {
  if (!env.REDIS_URL) {
    if (env.REDIS_REQUIRED) {
      throw new Error("REDIS_URL is required when REDIS_REQUIRED=true");
    }
    return false;
  }
  if (commandClient?.isReady && subscriberClient?.isReady) return true;

  const nextCommandClient = createRedisClient();
  const nextSubscriberClient = nextCommandClient.duplicate();
  nextSubscriberClient.on("error", (error) => logRedisError("subscriber", error));

  try {
    await nextCommandClient.connect();
    await nextSubscriberClient.connect();
    commandClient = nextCommandClient;
    subscriberClient = nextSubscriberClient;
    console.info(JSON.stringify({ event: "redis_connected" }));
    return true;
  } catch (error) {
    if (nextSubscriberClient.isOpen) await nextSubscriberClient.close().catch(() => undefined);
    if (nextCommandClient.isOpen) await nextCommandClient.close().catch(() => undefined);
    logRedisError("startup", error);
    if (env.REDIS_REQUIRED) throw error;
    return false;
  }
}

export function getRedisClient() {
  return commandClient?.isReady ? commandClient : null;
}

export function getRedisStatus() {
  return {
    configured: Boolean(env.REDIS_URL),
    required: env.REDIS_REQUIRED,
    ready: Boolean(commandClient?.isReady && subscriberClient?.isReady),
  };
}

export async function publishRedis(channel: string, message: string) {
  const client = getRedisClient();
  if (!client) return false;
  await client.publish(`${env.REDIS_KEY_PREFIX}:${channel}`, message);
  return true;
}

export async function subscribeRedis(channel: string, listener: (message: string) => void) {
  if (!subscriberClient?.isReady) return false;
  await subscriberClient.subscribe(`${env.REDIS_KEY_PREFIX}:${channel}`, listener);
  return true;
}

export function redisKey(...parts: Array<string | number>) {
  return [env.REDIS_KEY_PREFIX, ...parts].join(":");
}
