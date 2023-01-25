import express, { Express, Request, Response } from 'express';
import 'dotenv/config'
import TokenRegistryService, { CacheDataAssetKey, supportedNetworks, SupportedNetworks } from './services/TokenRegistryService';


const app: Express = express();
const port = process.env.PORT ? Number.parseInt(process.env.PORT, 10) : 4444;
const service = new TokenRegistryService();

app.use(express.json());

app.get('/api/network/:network/:asset/:id', (request: Request, response: Response) => {
    const { network, asset, id } = request.params;
    validateNetwork(network, response);
    validateAsset(asset, response);

    const assetCache = getAssetCache(network, asset);
    const exists = assetCache.has(id);

    response.status(200).send({
        id,
        type: asset === "native-tokens" ? "nativeToken" : "nft",
        exists
    });
});

type AssetRequestBody = {
    ids: string[]
}

app.post('/api/network/:network/:asset', (request: Request, response: Response) => {
    const { network, asset } = request.params;
    validateNetwork(network, response);
    validateAsset(asset, response);

    try {
        response.status(200).send(request.body);
    } catch {
        response.status(400).send({ error: "Body must be json." })
    }
});

function getAssetCache(network: string, asset: string) {
    const assetKey = (asset === "native-tokens" ? "nativeTokens" : asset) as CacheDataAssetKey;
    const networkKey = network as SupportedNetworks;
    return service.tokenRegistryCache[networkKey][assetKey];
}

function validateNetwork(network: string, response: Response) {
    if (!supportedNetworks.includes(network as SupportedNetworks)) {
        response.status(400).send({ error: "Bad network path parameter." });
    }
}

function validateAsset(asset: string, response: Response) {
    if (!(asset === "nfts" || asset === "native-tokens")) {
        response.status(400).send({ error: "Bad asset path parameter." });
    }
}

app.listen(port, () => {
    console.log(`⚡️[server]: Server is running at http://localhost:${port}`);
});

