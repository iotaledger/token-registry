export type CacheEntry = {
    projectName: string
    metadata: object
}

type CacheAssets = {
    [asset: string]: Map<string, CacheEntry>
}

export type Cache = {
    [network: string]: CacheAssets,
}

