import { AxiosResponse } from "axios";
import { CronJob } from "cron";
import { CONFIG } from "../config/configSchema";
import { githubApiClient } from "../config/axios";
import { CacheEntry, Cache } from "../models/cache";
import { GithubItem } from "../models/github";
import logger from "../config/logger";

const COLLECT_DATA_CRON_EXPR = "0 * * * *";
const FILE_NAME_REGEXP = new RegExp(/(?<project>\w+)-(?<id>\w+).json/);

class TokenRegistryService {
    private readonly config: CONFIG;

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
        new CronJob(COLLECT_DATA_CRON_EXPR, () => {
            logger.debug("Cron job starting...");
            this.populateCache()
        }).start();
    }

    private async fetchAssetData(network: string, assetType: string) {
        let response: AxiosResponse | undefined;
        logger.info(`Fetching fresh asset ${assetType} for network ${network}`);

        try {
            response = await githubApiClient.get(`${network}/${assetType}?ref=main`);
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
        logger.debug(`Fetched ${fileItems.length} ${assetType} for network ${network}`);

        const assetCacheEntryUpdate = new Map<string, CacheEntry>();
        for (const file of fileItems) {
            const fileName = file.name;
            const match = fileName.match(FILE_NAME_REGEXP);

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

