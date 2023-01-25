import axios from "axios";

const GITHUB_API_ROOT = "https://api.github.com/repos/iota-community/token-whitelist/contents/";
const MY_TOKEN = "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";

export const githubApiClient = axios.create({
    baseURL: GITHUB_API_ROOT,
    headers: {
        "Accept": "application/vnd.github+json",
        "Authorization": `Bearer ${MY_TOKEN}`
    }
});

