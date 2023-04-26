import { AxiosResponse } from "axios";
import { CronJob } from "cron";
import { CONFIG } from "../config/configSchema";
import { contentClient, treeClient, blobsClient } from "../config/axios";
import { CacheEntry, Cache } from "../models/cache";
import { GithubBlobItem, GithubItem, GithubTreeResponse } from "../models/github";
import logger from "../config/logger";

const FILE_NAME_REGEXP = new RegExp(/(?<project>\S+)-(?<id>\w+).json/);

/**
 * The flag indicates if the specific file has updated(added, modified or deleted) on github and should be re-fetched.
 */
interface FileUpdateFlags {
    network: string;
    assetType: string;
    projectName: string;
    assetId: string;
    sha: string;
    shouldDelete?: boolean;
}

class TokenRegistryService {
    private readonly config: CONFIG;

    private assetToChecksum: Map<string, string> = new Map();

    private assetToItemChecksumMap: Map<string, Map<string, string>> = new Map();

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
                this.assetToItemChecksumMap.set(`${network}/${asset}`, new Map<string, string>());
            }
        }

        logger.debug(`Instantiated new cache ${JSON.stringify(this.cache)}`);
    }

    private populateCache() {
        void this.refreshFolderHashes().then((fileUpdateFlags: FileUpdateFlags[]) => {
            logger.debug("Populating cache...");
            for (const asset of fileUpdateFlags) {
                if (asset.shouldDelete) {
                    this.deleteAssetData(asset);
                } else {
                    void this.fetchAssetData(asset);
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

    private async refreshFolderHashes(): Promise<FileUpdateFlags[]> {
        let response: AxiosResponse | undefined;
        const assetsToUpdate: string[] = [];
        let itemsToUpdate: FileUpdateFlags[] = [];

        for (const network of this.config.networks) {
            try {
                logger.debug("Refreshing network folder hashes");
                response = await contentClient.get(`/${network}`);

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
                                assetsToUpdate.push(mapKey);
                            } else {
                                const shouldUpdate = existingSha !== assetItem.sha;

                                if (shouldUpdate) {
                                    this.assetToChecksum.set(mapKey, assetItem.sha);
                                    assetsToUpdate.push(mapKey);
                                }
                            }
                        } else {
                            logger.warn(`Failed refreshing sha for ${network}/${asset}`);
                        }
                    }
                }
            } catch (error) {
                logger.error(`Refreshing network folder hashes failed! ${JSON.stringify(error)}`);
                return itemsToUpdate;
            }
        }

        for (const asset of assetsToUpdate) {
            const [network, assetType] = asset.split("/");
            const fileUpdateFlags = await this.refreshItemHashes(network, assetType);
            itemsToUpdate = [...itemsToUpdate, ...fileUpdateFlags];
        }

        return itemsToUpdate;
    }

    private async refreshItemHashes(network: string, assetType: string): Promise<FileUpdateFlags[]> {
        const mapKey = `${network}/${assetType}`;
        let response: AxiosResponse | undefined;
        const itemsToUpdate: FileUpdateFlags[] = [];

        logger.info(`Refreshing file hashes for ${mapKey}`);
        const assetSha = this.assetToChecksum.get(mapKey);
        const itemToChecksum = this.assetToItemChecksumMap.get(mapKey);

        if (!assetSha || !itemToChecksum) {
            logger.error(`Data fetch failed for '${mapKey}'. Folder sha not found in map!`);
            return itemsToUpdate;
        }

        try {
            response = await treeClient.get(`/${assetSha}`);
        } catch (error) {
            logger.error(`Data fetch failed for '${mapKey}'. ${JSON.stringify(error)}`);
            return itemsToUpdate;
        }

        if (!response || response.status !== 200) {
            logger.error(
                `Data fetch failed for '${mapKey}'. Got response ${response?.status ?? "undefined"}`
            );
            return itemsToUpdate;
        }

        const githubTreeResponse = response.data as GithubTreeResponse;
        const githubTree = githubTreeResponse.tree;
        let gitItemsCount = 0;

        for (const item of githubTree) {
            const fileName = item.path;
            const match = fileName.match(FILE_NAME_REGEXP);

            if (match?.groups && itemToChecksum) {
                const projectName = match.groups.project;
                const assetId = match.groups.id;

                if (item.type !== "blob" || item.path === ".gitkeep") {
                    continue;
                }
                gitItemsCount++;
                const existingSha = itemToChecksum.get(assetId);

                if (!existingSha) {
                    itemToChecksum.set(assetId, item.sha);
                    itemsToUpdate.push({
                        network,
                        assetType,
                        projectName,
                        assetId,
                        sha: item.sha
                    });
                } else {
                    const shouldUpdate = existingSha !== item.sha;

                    if (shouldUpdate) {
                        itemToChecksum.set(assetId, item.sha);
                        itemsToUpdate.push({
                            network,
                            assetType,
                            projectName,
                            assetId,
                            sha: item.sha
                        });
                    }
                }
            }
        }

        //find files that were deleted from github
        if(itemToChecksum && gitItemsCount !== itemToChecksum.size) {
            for (const [key, value] of itemToChecksum) {
                const foundItem = githubTree.find(gitItem => value === gitItem.sha)
                if (!foundItem) {
                    itemsToUpdate.push({
                        network,
                        assetType,
                        projectName: "",
                        assetId: key,
                        sha: value,
                        shouldDelete: true
                    });
                }
            }
        }

        return itemsToUpdate;
    }

    private async fetchAssetData(asset: FileUpdateFlags) {
        const {network, assetType, projectName, assetId, sha} = asset;

        try {
            const response = await blobsClient.get(`/${sha}`);
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
                this.cache[network][assetType].set(assetId, { projectName, metadata });
            } else {
                logger.warn(`Bad metadata content for ${assetType} with id ${assetId} (${network}). Skipping updating cache for this item.`);
            }
        } catch {
            logger.error(
                `Failed to fetch item metadata for asset ${assetType} with id ${assetId} (${network}).`
            );
        }
    }

    private deleteAssetData(asset: FileUpdateFlags) {
        const {network, assetType, assetId } = asset;
        logger.debug(`Deleting cache entry for ${network}/${assetType} asset id: ${assetId}`);

        const itemToChecksum = this.assetToItemChecksumMap.get(`${network}/${assetType}`);
        itemToChecksum?.delete(assetId);

        this.cache[network][assetType].delete(assetId);
    }
}

export default TokenRegistryService;

