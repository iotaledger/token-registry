import { z } from "zod";

const GithubItem = z.object({
    name: z.string(),
    type: z.string(),
    sha: z.string(),
    download_url: z.string(),
});

export type GithubItem = z.infer<typeof GithubItem>;

const GithubTreeItem = z.object({
    path: z.string(),
    sha: z.string(),
    type: z.string(),
    url: z.string()
})

export type GithubTreeItem = z.infer<typeof GithubTreeItem>;

export interface GithubTreeResponse {
    tree: GithubTreeItem[]
}

const GithubBlobItem = z.object({
    content: z.string()
});

export type GithubBlobItem = z.infer<typeof GithubBlobItem>;

