import { app } from "./app.js";
import { env } from "./config.js";
import {
  initializePublishedQuestionCacheCoordination,
  prewarmPublishedQuestionCache,
} from "./services/question-cache.js";
import { initializeRedis } from "./services/redis.js";

async function start() {
  try {
    const redisConnected = await initializeRedis();
    if (redisConnected) await initializePublishedQuestionCacheCoordination();

    app.listen(env.PORT, () => {
      console.log(`API listening on http://localhost:${env.PORT}`);
      void prewarmPublishedQuestionCache()
        .then((examCount) => {
          console.log(JSON.stringify({ event: "question_cache_prewarmed", examCount }));
        })
        .catch((error) => {
          console.warn(JSON.stringify({
            event: "question_cache_prewarm_failed",
            message: error instanceof Error ? error.message : String(error),
          }));
        });
    });
  } catch (error) {
    console.error(JSON.stringify({
      event: "api_start_failed",
      message: error instanceof Error ? error.message : String(error),
    }));
    process.exitCode = 1;
  }
}

void start();
