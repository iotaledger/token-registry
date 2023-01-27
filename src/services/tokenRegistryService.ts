import { AxiosResponse } from "axios";
import { CronJob } from "cron";
import { CONFIG } from "../config/configSchema";
import { githubApiClient } from "../config/axios";
import { CacheEntry, Cache } from "../models/cache";
import { GithubItem } from "../models/github";
import logger from "../config/logger";

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

        logger.debug(`Instantiated new cache ${JSON.stringify(this.cache)}`);
    }

    private populateCache() {
        logger.debug("Populating cache for all networks.");
        for (const network of this.config.networks) {
            for (const asset of this.config.assets) {
                void this.fetchAssetData(network, asset);
            }
        }
    }

    private scheduleCron() {
        logger.debug("Scheduling data collection job...");
        new CronJob(this.COLLECT_DATA_CRON_EXPR, () => {
            logger.debug("Cron job starting...");
            this.populateCache()
        }).start();
    }

    private async fetchAssetData(network: string, assetType: string) {
        let response: AxiosResponse | undefined;
        logger.info(`Fetching fresh asset ${assetType} for network ${network}`);

        try {
            response = await githubApiClient.get(`${network}/${assetType}?ref=dev`);
        } catch (error) {
            logger.error(`Data fetch failed for '${network}/${assetType}'. ${JSON.stringify(error)}`);
            return;
        }

        if (!response || response.status !== 200) {
            logger.error(
                `Data fetch failed for '${network}/${assetType}'. Got response ${response?.status ?? "undefined"}`
            );
            return;
        }

        const fileItems = response.data as GithubItem[];
        const assetCacheEntryUpdate = new Map<string, CacheEntry>();
        logger.debug(`Fetched ${fileItems.length} ${assetType} for network ${network}`);

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

