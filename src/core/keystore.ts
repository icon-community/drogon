import {panic} from '../helpers';
import crypto from 'crypto';
import {createHash} from 'crypto';
import {scrypt} from 'ethereum-cryptography/scrypt';
import {keccak256} from 'ethereum-cryptography/keccak';
import {bytesToHex} from 'ethereum-cryptography/utils';
import {secp256k1} from 'ethereum-cryptography/secp256k1';
import {IsString, addHxPrefix, isPrivateKey} from '../crypto';
import * as https from 'https';
import chalk from 'chalk';

export interface KeyStore {
  version: 3;
  id: string;
  address: string;
  crypto: {
    ciphertext: string;
    cipherparams: {
      iv: string;
    };
    cipher: string;
    kdf: any;
    kdfparams: {
      dklen: number;
      salt: string;
      prf: string;
      n: number;
      r: number;
      p: number;
      c: number;
    };
    mac: string;
  };
  coinType: 'icx';
}

export default class Wallet {
  private _privKey: any;

  private address: string;

  private url: string;

  constructor(privKey: typeof Buffer) {
    if (!privKey) {
      panic('A private key must be supplied to the constructor.');
    }

    if (privKey && !isPrivateKey(privKey)) {
      panic(`[${privKey}] is not a valid private key.`);
    }

    this._privKey = privKey;
    let pubKey = secp256k1.getPublicKey(this._privKey, false).slice(1);
    let address = createHash('sha3-256')
      .update(pubKey)
      .digest('hex')
      .slice(-40);

    this.address = addHxPrefix(address);
    this.url = `https://lisbon.tracker.solidwallet.io/v3/address/info?address=${this.address}`;
  }

  static async loadKeyStore(
    keystore: KeyStore | string,
    password: string,
    nonStrict: boolean
  ): Promise<Wallet> {
    const seed = await LoadKeystore(keystore, password, nonStrict);

    return new Wallet(seed as any);
  }

  /*
   * Get EOA address of wallet instance.
   */
  public getAddress(): string {
    return this.address;
  }

  async getInfo(): Promise<any> {
    const resp = await makeRequest(this.url);
    const walletInfo = JSON.parse(resp);

    if (walletInfo.result == '200') {
      const data = walletInfo.data;
      return data;
    } else {
      panic(`No data found for Wallet ${chalk.red(this.address)}`);
    }
  }

  async getBalance(): Promise<number> {
    const data = await this.getInfo();
    return parseFloat(data.balance);
  }

  async getBalanceUsd(): Promise<number> {
    const data = await this.getInfo();
    return parseFloat(data.icxUsd);
  }

  async showBalances() {
    const data = await this.getInfo();
    console.log('Balance (ICX) :   ' + chalk.green(data.balance));
    console.log(
      'Balance ($)   :  ' + chalk.red('$') + chalk.green(data.icxUsd)
    );
  }

  async updateDeploymentCosts() {
    const data = await this.getInfo();
  }

  async ensureHasBalance() {
    const data = await this.getInfo();
    if (data.balance == 0)
      panic(`Not enough balance on Wallet ${chalk.red(this.address)}`);
  }
}

export const LoadKeystore = async (
  keystore: KeyStore | string,
  password: string,
  nonStrict: boolean
): Promise<any> => {
  if (!IsString(password)) {
    panic('Password is invalid.');
  }

  const json: KeyStore =
    typeof keystore === 'object'
      ? keystore
      : JSON.parse(
          nonStrict
            ? (keystore as unknown as string).toLowerCase()
            : (keystore as string)
        );

  if (json.version !== 3) {
    panic('This is not a V3 wallet.');
  }

  let derivedKey: any;
  let kdfparams: KeyStore['crypto']['kdfparams'];

  if (json.crypto.kdf === 'scrypt') {
    kdfparams = json.crypto.kdfparams;
    derivedKey = await scrypt(
      Buffer.from(password) as any,
      Buffer.from(kdfparams.salt, 'hex') as any,
      kdfparams.n,
      kdfparams.p,
      kdfparams.r,
      kdfparams.dklen
    );
  } else if (json.crypto.kdf === 'pbkdf2') {
    kdfparams = json.crypto.kdfparams;

    if (kdfparams.prf !== 'hmac-sha256') {
      panic("It's an unsupported parameters to PBKDF2.");
    }

    derivedKey = crypto.pbkdf2Sync(
      Buffer.from(password),
      Buffer.from(kdfparams.salt, 'hex'),
      kdfparams.c,
      kdfparams.dklen,
      'sha256'
    );
  } else {
    panic("It's an unsupported key derivation scheme.");
  }

  const ciphertext = Buffer.from(json.crypto.ciphertext, 'hex');
  const mac = keccak256(Buffer.concat([derivedKey.slice(16, 32), ciphertext]));

  if (bytesToHex(mac) !== json.crypto.mac) {
    panic('Key derivation is failed (possibly wrong passphrase).');
  }

  const decipher = crypto.createDecipheriv(
    json.crypto.cipher,
    derivedKey.slice(0, 16),
    Buffer.from(json.crypto.cipherparams.iv, 'hex')
  );

  const seed = Buffer.concat([decipher.update(ciphertext), decipher.final()]);

  return seed;
};

async function makeRequest(url: string): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    https
      .get(url, res => {
        let data = '';

        res.on('data', chunk => {
          data += chunk;
        });

        res.on('end', () => {
          resolve(data);
        });
      })
      .on('error', error => {
        reject(error);
      });
  });
}
