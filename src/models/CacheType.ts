export type CacheEntry = {
    projectName: string
}

export type CacheDataAssetKey = "nfts" | "nativeTokens";

export type CacheData = {
    nfts: Map<string, CacheEntry>,
    nativeTokens: Map<string, CacheEntry>
}

export type TokenRegistryServiceCache = {
    alphanet: CacheData,
    testnet: CacheData,
    shimmer: CacheData,
    iota: CacheData
}
