export type CacheEntry = {
    projectName: string
}

type CacheAssets = {
    [asset: string]: Map<string, CacheEntry>
}

export type Cache = {
    [network: string]: CacheAssets,
}

