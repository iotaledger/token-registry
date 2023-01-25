
export const supportedNetworks = ["alphanet", "testnet", "shimmer", "iota"] as const;
export type SupportedNetworks = typeof supportedNetworks[number];