# Mac Development

## QuickStart

```shell
npm install -g yarn
npm install -g nx
corepack enable
yarn install
go work sync
poetry install
```

```shell
docker-compose -f docker-compose.local.yaml down --volumes --remove-orphans
docker-compose -f docker-compose.local.yaml up -d
```

```shell
brew install black
brew install isort
yarn lint:fix && yarn format
```
