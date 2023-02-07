# Token Registry Service

A simple service which loads a token whitelist such as https://github.com/iota-community/token-whitelist and provides
an API to query for specific whitelist memberships of assets.

Please check out the [REST API](https://editor.swagger.io/?url=https://raw.githubusercontent.com/iotaledger/token-registry/main/rest-api.yaml).

### Deployment

Make sure to copy `config.template.json` and `.env.template` to `config.json`/`.env` respectively and adjust the config
parameters to define to the correct asset types, repository and supported networks.