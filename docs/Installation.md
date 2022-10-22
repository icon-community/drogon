## Drogon Installation

Currently Drogon is in active development and is still in beta. The instructions for installation and usage might change.

### Requirements and dependencies

- Docker
- Node.js

### Instructions

```sh
npm install yarn -g
git clone https://github.com/icon-community/drogon -b dev-0.1.0
cd drogon
yarn
```

Please start the `Docker` before running any of the following commands.

### drogon install

The sub-command install pulls in the docker images of gochain and Drogon from icon-community's GHCR packages. Please make sure Docker is running before running `drogon install`

```sh
yarn run drogon install
```
