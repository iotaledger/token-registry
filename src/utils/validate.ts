import { NextFunction, Request, Response } from 'express';
import logger from '../config/logger';
import { buildConfig, CONFIG } from '../config/configSchema';
import { assetRequestBodySchema, AssetsRequestBody } from '../models/api/assetRequest';

const config: CONFIG = buildConfig();

export function validateNetwork(request: Request, response: Response, next: NextFunction) {
    const { network, asset } = request.params;
    if (!config.networks.includes(network)) {
        logger.debug(`Invalid request with! Unsupported network "${network}" for asset ${asset}`);
        response.status(400).send({ error: "Bad network path parameter." });
    } else {
        next();
    }
}

export function validateAsset(request: Request, response: Response, next: NextFunction) {
    const { network, asset } = request.params;
    if (!config.assets.includes(asset)) {
        logger.debug(`Invalid request! Unsupported asset "${asset}" on network ${network}`);
        response.status(400).send({ error: "Bad asset path parameter." });
    } else {
        next();
    }
}

export function validateAssetsRequestBody(request: Request, response: Response, next: NextFunction) {
    const { network, asset } = request.params;
    const body = request.body as AssetsRequestBody;
    const result = assetRequestBodySchema.safeParse(body);

    if (!result.success) {
        logger.debug(`Invalid request body (${network}/${asset}). Body: ${JSON.stringify(body)}`);
        response.status(400).send(result.error);
    } else {
        next();
    }
}

