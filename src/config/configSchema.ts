import { z } from "zod";
import config from "../config/config.json";

const configSchema = z.object({
    assets: z.array(z.string()).min(1),
    networks: z.array(z.string().min(1))
});

export type CONFIG = z.infer<typeof configSchema>

export function buildConfig(): CONFIG {
    const results = configSchema.safeParse(config);

    if (!results.success) {
        throw new Error(`Invalid config.json: ${results.error.message}`);
    }

    return results.data;
}

