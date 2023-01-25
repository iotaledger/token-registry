import 'dotenv/config'
import express, { Express, Request, Response } from 'express';
import { AssetsRequestBody } from './models/AssetType';
import { CacheDataAssetKey } from './models/CacheType';
import { supportedNetworks, SupportedNetworks } from './models/Networktype';
import TokenRegistryService from './services/TokenRegistryService';

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

    response.status(200).send({[id]: exists});
});

app.post('/api/network/:network/:asset', (request: Request, response: Response) => {
    const { network, asset } = request.params;
    validateNetwork(network, response);
    validateAsset(asset, response);

    const body = request.body as AssetsRequestBody;
    validateAssetsRequestBody(body, response);

    const assetCache = getAssetCache(network, asset);
    const results: {[key: string]: boolean} = {};
    for (const id of body.ids) {
        if (typeof id === 'string') {
            const exists = assetCache.has(id);
            results[id] = exists;
        }
    }

    response.status(200).send(results);
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
function validateAssetsRequestBody(body: AssetsRequestBody, response: Response) {
    if (!body.ids || !Array.isArray(body.ids)) {
        response.status(400).send({ error: "Bad request body." });
    }
}

app.listen(port, () => {
    console.log(`⚡️[server]: Server is running at http://localhost:${port}`);
});

