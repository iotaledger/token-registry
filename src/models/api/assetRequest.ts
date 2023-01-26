import { z } from "zod";

export const assetRequestBodySchema = z.object({
    ids: z.array(z.string()).min(1)
});

export type AssetsRequestBody = z.infer<typeof assetRequestBodySchema>

