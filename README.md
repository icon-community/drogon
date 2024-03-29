# Drogon

<p align="center">
  <a href="https://drogon.io">
    <img alt="Drogon" src="docs/logo.png" width="200" />
  </a>
</p>

## Overview

Drogon is a robust, lightweight application development framework used for developing, testing, and deploying smart contracts on the ICON blockchain. The core features of the Drogon makes ICON smart contract developers’ life easy by providing support for multiple contract compilations, tests, and deploying on a public and private network.

### Requirements

- Docker
- nodejs (to install from the npm registry)

## Installation

```sh
npm install -g @icon-community/drogon
```

## Usage

### drogon install

> Please make sure to start Docker before running any of the following commands. only has to be done once per installation

The sub-command `install` pulls in the docker images of gochain and Drogon from icon-community's packages and makes Drogon action ready.

NOTE: `install` must be done before running any other sub-commands.

### drogon init

```sh
drogon init
```

### drogon compile

```sh
drogon compile --help
drogon compile -p /path/to/drogon/project
drogon compile -p /path/to/drogon/project <gradle flags here>
```

### Features

Drogon offers:

- end-to-end build cycle support for development, testing, and deploying smart contracts
- support for testing Unit and integration tests
- Scriptable deployment framework
- Deployment management for deploying to public and private networks
- Interactive console to directly communicate with public and private networks
- Clear documentation for developers

### Why Drogon?

- Lack of smart contract testing setup
- Lack of easy to use ICON smart contract life cycle management
- Lack of development framework that focuses on ICON smart contract developers

### Goals

- Development framework that focuses on ICON blockchain
- Support for smart contract life cycle management
- Support for unit and integration tests for smart contracts
- Support for REPL interface to interact with public and private networks
- Documentation

## Milestones

### M01

- Create Drogon framework that supports compilation and testing
- Support deploying contracts to a private network using the Drogon framework
- Support deploying contracts to public networks using the Drogon framework

### M02

- Documentation
- Testing Drogon
- Release Drogon v1.0.0

### M03

- Support and Ongoing maintenance of Drogon
- Includes bug fixes and on-going updates

## TODO

- [ ] configurable memory options for Gradle. JVM Memory options
- [ ] port github actions to Docker hub
- [ ] Adding new contract to an existing Drogon project
- [ ] Adding new Unit/Int Test an existing Drogon project
- [ ] Implement test, deploy commands

## Contact

- [Chai](https://twitter.com/ant4g0nist)
- [r3dsm0k3](https://twitter.com/r3dsm0k3)
- [FOMOmental](https://twitter.com/FOMOmental)
