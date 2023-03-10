import { AxiosResponse } from "axios";
import { CronJob } from "cron";
import { CONFIG } from "../config/configSchema";
import { contentClient, treeClient, blobsClient } from "../config/axios";
import { CacheEntry, Cache } from "../models/cache";
import { GithubBlobItem, GithubItem, GithubTreeResponse } from "../models/github";
import logger from "../config/logger";

const FILE_NAME_REGEXP = new RegExp(/(?<project>\S+)-(?<id>\w+).json/);

/**
 * The key is a composite key of `${network}/${asset}`.
 * The value indicates if the specific asset folder has updated on github and should be re-fetched.
 */
interface AssetUpdateFlags {
    [key: string]: boolean
}

class TokenRegistryService {
    private readonly config: CONFIG;

    private assetToChecksum: Map<string, string> = new Map();

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
        void this.refreshFolderHashes().then((assetUpdateFlags: AssetUpdateFlags | undefined) => {
            logger.debug("Populating cache...");
            for (const network of this.config.networks) {
                for (const asset of this.config.assets) {
                    const networkAssetKey = `${network}/${asset}`;
                    const shouldRefreshData = assetUpdateFlags && assetUpdateFlags[networkAssetKey];

                    if (shouldRefreshData) {
                        void this.fetchAssetData(network, asset);
                    } else {
                        logger.debug(`Skipping fetch for asset data ${network}/${asset}. Nothing changed.`)
                    }
                }
            }
        });
    }

    private scheduleCron() {
        logger.debug("Scheduling data collection job...");
        new CronJob(this.config.dataFetchCronExpr, () => {
            logger.debug("Cron job starting...");
            this.populateCache()
        }).start();
    }

    private async refreshFolderHashes(): Promise<AssetUpdateFlags | undefined> {
        let response: AxiosResponse | undefined;
        const result: AssetUpdateFlags = {};

        for (const network of this.config.networks) {
            try {
                logger.debug("Refreshing network folder hashes");
                response = await contentClient.get(`/${network}/`);

                if (response?.status === 200) {
                    const networkAssets = response.data as GithubItem[];

                    for (const asset of this.config.assets) {
                        const assetItem = networkAssets.find(na => na.name === asset);
                        if (assetItem) {
                            const mapKey = `${network}/${asset}`;
                            logger.debug(`Adding to network/asset sha ${assetItem.sha} for ${network}/${asset}`);
                            const existingSha = this.assetToChecksum.get(mapKey);

                            if (!existingSha) {
                                this.assetToChecksum.set(mapKey, assetItem.sha);
                                result[mapKey] = true;
                            } else {
                                const shouldUpdate = existingSha !== assetItem.sha;

                                if (shouldUpdate) {
                                    this.assetToChecksum.set(mapKey, assetItem.sha);
                                    result[mapKey] = true;
                                }
                            }
                        } else {
                            logger.warn(`Failed refreshing sha for ${network}/${asset}`);
                        }
                    }
                }
            } catch (error) {
                logger.error(`Refreshing network folder hashes failed! ${JSON.stringify(error)}`);
                return undefined;
            }
        }

        return result;
    }

    private async fetchAssetData(network: string, assetType: string) {
        let response: AxiosResponse | undefined;
        logger.info(`Fetching fresh asset ${assetType} for network ${network}`);

        const assetSha = this.assetToChecksum.get(`${network}/${assetType}`);

        if (!assetSha) {
            logger.error(`Data fetch failed for '${network}/${assetType}'. Folder sha not found in map!`);
            return;
        }

        try {
            response = await treeClient.get(`/${assetSha}`);
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

        const githubTreeResponse = response.data as GithubTreeResponse;
        const githubTree = githubTreeResponse.tree;

        logger.debug(`Fetched ${githubTree.length} ${assetType} for network ${network}`);

        const assetCacheEntryUpdate = new Map<string, CacheEntry>();

        for (const item of githubTree) {
            if (item.type !== "blob" || item.path === ".gitkeep") {
                continue;
            }

            const fileName = item.path;
            const match = fileName.match(FILE_NAME_REGEXP);

            if (match?.groups) {
                const projectName = match.groups.project;
                const assetId = match.groups.id;

                try {
                    const response = await blobsClient.get(`/${item.sha}`);
                    if (!response || response.status !== 200) {
                        throw new Error("Fetching metadata");
                    }

                    const githubBlob = response.data as GithubBlobItem;
                    const metadata: object = JSON.parse(
                        Buffer.from(
                            githubBlob.content,
                            "base64"
                        ).toString("utf8")
                    ) as object;


                    if (metadata) {
                        logger.debug(`Adding cache entry for ${network}/${assetType} asset id: ${assetId}`);
                        assetCacheEntryUpdate.set(assetId, { projectName, metadata });
                    } else {
                        logger.warn(`Bad metadata content for ${assetType} with id ${assetId} (${network}). Skipping updating cache for this item.`);
                    }
                } catch {
                    logger.error(
                        `Failed to fetch item metadata for asset ${assetType} with id ${assetId} (${network}).`
                    );
                }
            }
        }

        logger.info(`Refreshing asset data for ${network}/${assetType} finished! Replacing cache entry.`)
        this.cache[network][assetType] = assetCacheEntryUpdate;
    }
}

export default TokenRegistryService;

