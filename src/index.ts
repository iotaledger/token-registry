import 'dotenv/config'
import express, { Express, Request, Response } from 'express';
import { loadConfig, CONFIG } from './config/configSchema';
import logger from './config/logger';
import TokenRegistryService from './services/tokenRegistryService';
import { validateAsset, validateAssetsRequestBody, validateNetwork } from './utils/validate';
import { AssetsRequestBody } from './models/api/assetRequest';

const config: CONFIG = loadConfig();
const port = process.env.PORT ? Number.parseInt(process.env.PORT, 10) : 4444;
const service = new TokenRegistryService(config);
const app: Express = express();

app.use(express.json());

app.get(
    '/api/network/:network/:asset/:id',
    validateNetwork(config),
    validateAsset(config),
    (request: Request, response: Response) => {
        const { network, asset, id } = request.params;
        const assetCache = getAssetCache(network, asset);
        const exists = assetCache.has(id);

        response.status(200).send({ success: exists });
    });

app.get(
    '/api/network/:network/:asset/:id/metadata',
    validateNetwork(config),
    validateAsset(config),
    (request: Request, response: Response) => {
        const { network, asset, id } = request.params;
        const assetCache = getAssetCache(network, asset);
        const entry = assetCache.get(id);

        response.status(200).send({
            success: !!entry,
            metadata: entry?.metadata
        })
    });

app.post(
    '/api/network/:network/:asset',
    validateNetwork(config),
    validateAsset(config),
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

app.post(
    '/api/network/:network/:asset/metadata',
    validateNetwork(config),
    validateAsset(config),
    validateAssetsRequestBody,
    (request: Request, response: Response) => {
        const { network, asset } = request.params;
        const body = request.body as AssetsRequestBody;

        const assetCache = getAssetCache(network, asset);
        const results: { [key: string]: object } = {};
        for (const id of body.ids) {
            if (typeof id === 'string') {
                const entry = assetCache.get(id);
                results[id] = {
                    success: !!entry,
                    metadata: entry?.metadata
                }
            }
        }

        response.status(200).send(results);
    });

app.use((request: Request, response: Response) => {
    response.status(404).send({ error: `Cannot ${request.method} ${request.url}` });
});

function getAssetCache(network: string, asset: string) {
    return service.tokenRegistryCache[network][asset];
}

app.listen(port, () => {
    logger.info(`⚡️Running at http://localhost:${port}`);
});

