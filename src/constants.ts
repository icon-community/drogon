export const DROGON_IMAGE = 'iconcommunity/drogon:latest';
export const DROGON_NETWORK_NODE = 'drogon-local-node'

export const GOCHAIN_IMAGE = 'iconcommunity/gochain:latest';

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

export const ICON_ICONEE_CONFIG = `{
    "termPeriod": 300,
    "mainPRepCount": 1,
    "extraMainPRepCount": 0,
    "subPRepCount": 4
}  
`;

export const ICON_GENESIS = `{
    "accounts": [
      {
        "address": "hxb6b5791be0b5ef67063b3c10b840fb81514db2fd",
        "balance": "0x2961fff8ca4a62327800000",
        "name": "god"
      },
      {
        "address": "hx1000000000000000000000000000000000000000",
        "balance": "0x0",
        "name": "treasury"
      },
      {
        "address": "cx0000000000000000000000000000000000000001",
        "name": "governance",
        "score": {
          "contentId": "hash:{{ziphash:governance}}",
          "contentType": "application/zip",
          "owner": "hxb6b5791be0b5ef67063b3c10b840fb81514db2fd"
        }
      }
    ],
    "chain": {
      "revision": "0x13",
      "blockInterval": "0x3e8",
      "fee": {
        "stepPrice": "0x2e90edd00",
        "stepLimit": {
          "invoke": "0x9502f900",
          "query": "0x2faf080"
        },
        "stepCosts": {
          "default": "0x186a0",
          "contractCall": "0x61a8",
          "contractCreate": "0x3b9aca00",
          "contractUpdate": "0x5f5e1000",
          "contractDestruct": "-0x11170",
          "contractSet": "0x7530",
          "get": "0x0",
          "set": "0x140",
          "replace": "0x50",
          "delete": "-0xf0",
          "input": "0xc8",
          "eventLog": "0x64",
          "apiCall": "0x2710"
        }
      },
      "validatorList": [
        "hxb6b5791be0b5ef67063b3c10b840fb81514db2fd"
      ]
    },
    "message": "genesis for local node",
    "nid": "0x3"
  }
`;

export const ICON_CONFIG = `{
    "nid": 3,
    "channel": "default",
    "concurrency_level": 1,
    "db_type": "goleveldb",
    "ee_instances": 1,
    "ee_socket": "",
    "engines": "python,java",
    "p2p": "127.0.0.1:8080",
    "p2p_listen": "",
    "role": 2,
    "rpc_addr": ":9082",
    "rpc_debug": true,
    "rpc_dump": false,
    "log_level": "trace",
    "seed_addr": "",
    "key_store": {
      "address": "hxb6b5791be0b5ef67063b3c10b840fb81514db2fd",
      "id": "87323a66-289a-4ce2-88e4-00278deb5b84",
      "version": 3,
      "coinType": "icx",
      "crypto": {
        "cipher": "aes-128-ctr",
        "cipherparams": {
          "iv": "069e46aaefae8f1c1f840d6b09144999"
        },
        "ciphertext": "f35ff7cf4f5759cb0878088d0887574a896f7f0fc2a73898d88be1fe52977dbd",
        "kdf": "scrypt",
        "kdfparams": {
          "dklen": 32,
          "n": 65536,
          "r": 8,
          "p": 1,
          "salt": "0fc9c3b24cdb8175"
        },
        "mac": "1ef4ff51fdee8d4de9cf59e160da049eb0099eb691510994f5eca492f56c817a"
      }
    },
    "key_password": "gochain"
  }
  `;
