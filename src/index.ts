import 'dotenv/config'
import express, { Express, NextFunction, Request, Response } from 'express';
import { buildConfig, CONFIG } from './config/configSchema';
import TokenRegistryService from './services/registryService';
import { assetRequestBodySchema, AssetsRequestBody } from './models/api/assetRequest';

const app: Express = express();
const port = process.env.PORT ? Number.parseInt(process.env.PORT, 10) : 4444;
const config: CONFIG = buildConfig();
const service = new TokenRegistryService(config);

app.use(express.json());

app.get(
    '/api/network/:network/:asset/:id',
    validateNetwork,
    validateAsset,
    (request: Request, response: Response) => {
        const { network, asset, id } = request.params;
        const assetCache = getAssetCache(network, asset);
        const exists = assetCache.has(id);

        response.status(200).send({ [id]: exists });
    });

app.post(
    '/api/network/:network/:asset',
    validateNetwork,
    validateAsset,
    validateAssetsRequestBody,
    (request: Request, response: Response) => {
        const { network, asset } = request.params;
        const body = request.body as AssetsRequestBody;

        const assetCache = getAssetCache(network, asset);
        const results: { [key: string]: boolean } = {};
        for (const id of body.ids) {
            if (typeof id === 'string') {
                const exists = assetCache.has(id);
                results[id] = exists;
            }
        }

        response.status(200).send(results);
    });

function getAssetCache(network: string, asset: string) {
    return service.tokenRegistryCache[network][asset];
}

function validateNetwork(request: Request, response: Response, next: NextFunction) {
    const { network } = request.params;
    if (!config.networks.includes(network)) {
        response.status(400).send({ error: "Bad network path parameter." });
    } else {
        next();
    }
}

function validateAsset(request: Request, response: Response, next: NextFunction) {
    const { asset } = request.params;
    if (!config.assets.includes(asset)) {
        response.status(400).send({ error: "Bad asset path parameter." });
    } else {
        next();
    }
}
function validateAssetsRequestBody(request: Request, response: Response, next: NextFunction) {
    const body = request.body as AssetsRequestBody;
    const result = assetRequestBodySchema.safeParse(body);

    if (!result.success) {
        response.status(400).send(result.error);
    } else {
        next();
    }
}

app.listen(port, () => {
    console.log(`⚡️[server]: Server is running at http://localhost:${port}`);
});

