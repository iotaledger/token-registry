import { z } from "zod";

const GithubItem = z.object({
    name: z.string(),
    type: z.string(),
    download_url: z.string(),
});

export type GithubItem = z.infer<typeof GithubItem>;

