import { AxiosResponse } from "axios";
import { CronJob } from "cron";
import { githubApiClient } from "../axios";
import { AssetType } from "../models/AssetType";
import { CacheEntry, TokenRegistryServiceCache } from "../models/CacheType";
import { GithubItem } from "../models/GitHubItem";
import { SupportedNetworks, supportedNetworks } from "../models/Networktype";


class TokenRegistryService {
    /**
     * The collect token data from github interval cron expression.
     * Every hour at 0 min
     */
    private COLLECT_TOKEN_DATA_CRON = "0 * * * *";

    private FILE_NAME_REGEX = /(?<project>\w+)-(?<id>\w+).json/;
    
    private cache: TokenRegistryServiceCache;

    constructor() {
        this.cache = {
            alphanet: {
                nfts: new Map<string, CacheEntry>(),
                nativeTokens: new Map<string, CacheEntry>()
            },
            testnet: {
                nfts: new Map<string, CacheEntry>(),
                nativeTokens: new Map<string, CacheEntry>()
            },
            shimmer: {
                nfts: new Map<string, CacheEntry>(),
                nativeTokens: new Map<string, CacheEntry>()
            },
            iota: {
                nfts: new Map<string, CacheEntry>(),
                nativeTokens: new Map<string, CacheEntry>()
            }
        }

        this.populateCache();
        this.scheduleCron();
    }

    public get tokenRegistryCache() {
        return this.cache;
    }

    private populateCache() {
        console.log("Populating cache...");
        for (const network of supportedNetworks) {
            void this.fetchAssetData(network, "native-tokens");
            void this.fetchAssetData(network, "nfts");
        }
    }

    private scheduleCron() {
        new CronJob(this.COLLECT_TOKEN_DATA_CRON, () => this.populateCache()).start();
    }

    private async fetchAssetData(network: SupportedNetworks, assetType: AssetType) {
        let response: AxiosResponse | undefined;
        const assetCacheKey = assetType === "native-tokens" ? "nativeTokens" : assetType;

        try {
            response = await githubApiClient.get(`${network}/${assetType}?ref=dev`);
        } catch (error) {
            console.log(`Github api fetch failed (${network}/${assetType}).`, error);
        }

        if (response?.status === 200) {
            const fileItems = response.data as GithubItem[];

            for (const file of fileItems) {
                const fileName = file.name;
                const fileNameRegex = new RegExp(this.FILE_NAME_REGEX);
                const match = fileName.match(fileNameRegex);

                if (match?.groups) {
                    const projectName = match.groups.project;
                    const assetId = match.groups.id;

                    this.cache[network][assetCacheKey].set(assetId, { projectName });
                }

            }
        } else {
            console.log(`Github api fetch failed (${network}/${assetType}).`, response?.status);
        }

        console.log("Cache state:", this.cache);
    }
}

export default TokenRegistryService;

