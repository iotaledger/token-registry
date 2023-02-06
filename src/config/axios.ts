import axios from "axios";

const githubApiRootPath = process.env.GITHUB_API_WHITELIST_ROOT;
if (!githubApiRootPath) {
    throw new Error("Github api root path not set.");
}

const githubApiToken = process.env.GITHUB_TOKEN;
if (!githubApiToken) {
    throw new Error("Github api token not set.");
}

export const githubApiClient = axios.create({
    baseURL: githubApiRootPath,
    headers: {
        "Accept": "application/vnd.github+json",
        "Authorization": `Bearer ${githubApiToken}`
    }
});

