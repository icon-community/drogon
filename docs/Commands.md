## Drogon Subcommands

### drogon init

The sub-command `init` initialises a Drogon project with or without boilerplate.

```sh
yarn run drogon init
```

### drogon compile

The sub-command **compile**, compiles the contracts available. All the flags of `gradle` are supported and available for use with **drogon compile**.

```sh
yarn run drogon compile
```

Sample structure of Drogon project:

### drogon test

```sh
yarn run drogon test -p /path/to/drogon/project
```

### drogon gradlew

Drogon provides `gradlew` sub-command. Run gradlew commands against the Drogon project.

```sh
yarn drogon gradlew -p /path/to/drogon/project
yarn drogon gradlew -p /path/to/drogon/project <gradle commands here>
```

### drogon optimize

The sub-command **optimize**, optimize the contracts available. `drogon optimize` command finds the tasks named `optimizeJar` in the contract build settings and runs the tasks.

```sh
yarn drogon optimize -p /path/to/drogon/project
yarn drogon optimize -p /path/to/drogon/project <gradle commands here>
```

### drogon deploy

The sub-command **deploy**, deploys the contracts available. `drogon deploy` command finds the tasks named `deployJar` in the contract build settings and runs the tasks.

```sh
yarn drogon deploy -p /path/to/drogon/project
yarn drogon deploy -p /path/to/drogon/project <gradle commands here>
```
