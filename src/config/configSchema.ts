import fs from "node:fs";
import { z } from "zod";
import { CronJob } from "cron";
import logger from "./logger";

const configSchema = z.object({
    assets: z.array(z.string()).min(1),
    networks: z.array(z.string().min(1)),
    dataFetchCronExpr: z.string()
});

export type CONFIG = z.infer<typeof configSchema>

export function loadConfig(): CONFIG {
    logger.debug("Loading config...");
    const configJson = fs.readFileSync("./config.json", "utf8");
    const config: unknown = JSON.parse(configJson);
    const results = configSchema.safeParse(config);

    if (!results.success) {
        throw new Error(`Invalid config.json: ${results.error.message}`);
    }

    try {
        new CronJob(results.data.dataFetchCronExpr, () => {
            console.log("cron expr validation");
        })
    } catch {
        throw new Error(`Invalid cron expression in config.json.`);
    }

    logger.info(`Loaded config ${JSON.stringify(config)}`);
    return results.data;
}

