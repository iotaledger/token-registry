import axios from "axios";

const GITHUB_API_ROOT = "https://api.github.com/repos/iota-community/token-whitelist/contents/";
const githubApiToken = process.env.GITHUB_TOKEN;
if (!githubApiToken) {
    throw new Error("Github api token not set.");
}

export const githubApiClient = axios.create({
    baseURL: GITHUB_API_ROOT,
    headers: {
        "Accept": "application/vnd.github+json",
        "Authorization": `Bearer ${githubApiToken}`
    }
});

