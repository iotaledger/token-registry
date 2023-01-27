import 'dotenv/config'
import express, { Express, Request, Response } from 'express';
import { buildConfig, CONFIG } from './config/configSchema';
import logger from './config/logger';
import TokenRegistryService from './services/registryService';
import { validateAsset, validateAssetsRequestBody, validateNetwork } from './utils/validate';
import { AssetsRequestBody } from './models/api/assetRequest';

const config: CONFIG = buildConfig();
const port = process.env.PORT ? Number.parseInt(process.env.PORT, 10) : 4444;
const service = new TokenRegistryService(config);
const app: Express = express();

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

app.listen(port, () => {
    logger.info(`⚡️Running at http://localhost:${port}`);
});

