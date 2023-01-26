import { AxiosResponse } from "axios";
import { CronJob } from "cron";
import { CONFIG } from "../config/configSchema";
import { githubApiClient } from "../config/axios";
import { CacheEntry, Cache } from "../models/cache";
import { GithubItem } from "../models/github";

class TokenRegistryService {
    private COLLECT_DATA_CRON_EXPR = "0 * * * *";

    private FILE_NAME_REGEX = /(?<project>\w+)-(?<id>\w+).json/;

    private config: CONFIG;

    private cache: Cache = {};

    constructor(config: CONFIG) {
        this.config = config;

        this.buildCache();
        this.populateCache();
        this.scheduleCron();
    }

    public get tokenRegistryCache() {
        return this.cache;
    }

    private buildCache() {
        for (const network of this.config.networks) {
            this.cache[network] = {};
            for (const asset of this.config.assets) {
                this.cache[network][asset] = new Map<string, CacheEntry>()
            }
        }
    }

    private populateCache() {
        for (const network of this.config.networks) {
            for (const asset of this.config.assets) {
                void this.fetchAssetData(network, asset);
            }
        }
    }

    private scheduleCron() {
        new CronJob(this.COLLECT_DATA_CRON_EXPR, () => this.populateCache()).start();
    }

    private async fetchAssetData(network: string, assetType: string) {
        let response: AxiosResponse | undefined;

        try {
            response = await githubApiClient.get(`${network}/${assetType}?ref=dev`);
        } catch (error) {
            console.log(`Github api fetch failed (${network}/${assetType}).`, error);
            return;
        }

        if (!response || response.status !== 200) {
            console.log(`Github api fetch failed (${network}/${assetType}).`, response?.status ?? "");
            return;
        }

        const fileItems = response.data as GithubItem[];
        const assetCacheEntryUpdate = new Map<string, CacheEntry>();

        for (const file of fileItems) {
            const fileName = file.name;
            const fileNameRegex = new RegExp(this.FILE_NAME_REGEX);
            const match = fileName.match(fileNameRegex);

            if (match?.groups) {
                const projectName = match.groups.project;
                const assetId = match.groups.id;

                assetCacheEntryUpdate.set(assetId, { projectName });
            }
        }

        this.cache[network][assetType] = assetCacheEntryUpdate;
    }
}

export default TokenRegistryService;

