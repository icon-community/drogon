export const DROGON_IMAGE = 'iconcommunity/drogon:latest';


export const ICON_SANDBOX_DATA_REPO = 'icon-project/gochain-local';

export const ICON_TEMPLATES_REPO = 'icon-project/java-score-examples';

export const ICON_ICONENV = [
  'GOCHAIN_CONFIG=/goloop/data/config.json',
  'GOCHAIN_GENESIS=/goloop/data/genesis.json',
  'GOCHAIN_DATA=/goloop/chain/iconee',
  'GOCHAIN_LOGFILE=/goloop/chain/iconee.log',
  'GOCHAIN_DB_TYPE=rocksdb',
  'GOCHAIN_CLEAN_DATA=true',
  'JAVAEE_BIN=/goloop/execman/bin/execman',
  'PYEE_VERIFY_PACKAGE=true',
  'ICON_CONFIG=/goloop/data/icon_config.json',
];


export const ICON_CONFIG = `{
  "nid": 3,
  "channel": "default",
  "concurrency_level": 1,
  "db_type": "goleveldb",
  "ee_instances": 1,
  "ee_socket": "",
  "engines": "java",
  "p2p": "127.0.0.1:8080",
  "p2p_listen": "",
  "role": 1,
  "rpc_addr": ":9082",
  "rpc_debug": true,
  "rpc_dump": false,
  "log_level": "trace",
  "seed_addr": "",
  "genesis": {
    "message": "gochain generated genesis",
    "nid":"0x3"
  },
  "chain_dir": "",
  "ws_max_session": 10,
  "key_store": {
    "address": "hx3088becaac5c71603bb9cded93af841ffbddde04",
    "id": "69589581-0573-4758-93e2-c46cf01de067",
    "version": 3,
    "coinType": "icx",
    "crypto": {
      "cipher": "aes-128-ctr",
      "cipherparams": {
        "iv": "198e71cedcc5a008f4605e636939a970"
      },
      "ciphertext": "800da34e391e2771881aaa9b041f519c2c3a0479304946d053e0e0bfd1478253",
      "kdf": "scrypt",
      "kdfparams": {
        "dklen": 32,
        "n": 65536,
        "r": 8,
        "p": 1,
        "salt": "f4287ebe3af7e4eb"
      },
      "mac": "b012ab8ef387d4ef68b165da047da39cbcd73fe3d50eef4a16dadb7301bf79f2"
    }
  },
  "consensus":{
    "termPeriod": 300,
    "mainPRepCount": 1,
    "extraMainPRepCount": 0,
    "subPRepCount": 4
  },
  
  "key_password": "gochain",
  "console_level": "trace"
}
  `;
