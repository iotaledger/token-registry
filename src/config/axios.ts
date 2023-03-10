import axios from "axios";

const githubToken = process.env.GITHUB_TOKEN;
if (!githubToken) {
    throw new Error("Github API token not set.");
}

const githubApiRootPath = process.env.GITHUB_API_WHITELIST_ROOT;
if (!githubApiRootPath) {
    throw new Error("Github api root path not set.");
}

export const contentClient = axios.create({
    baseURL: `${githubApiRootPath}/contents`,
    headers: {
        "Accept": "application/vnd.github+json",
        "Authorization": `Bearer ${githubToken}`
    }
});

export const treeClient = axios.create({
    baseURL: `${githubApiRootPath}/git/trees`,
    headers: {
        "Accept": "application/vnd.github+json",
        "Authorization": `Bearer ${githubToken}`
    }
});

export const blobsClient = axios.create({
    baseURL: `${githubApiRootPath}/git/blobs`,
    headers: {
        "Accept": "application/vnd.github+json",
        "Authorization": `Bearer ${githubToken}`
    }
});

