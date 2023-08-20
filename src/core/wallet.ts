
import { panic } from '../helpers';
import crypto from 'crypto';
import { createHash } from 'crypto';
import { scrypt } from 'ethereum-cryptography/scrypt';
import { keccak256 } from 'ethereum-cryptography/keccak';
import { bytesToHex } from 'ethereum-cryptography/utils';
import { secp256k1 } from 'ethereum-cryptography/secp256k1';
import { IsString, addHxPrefix, isPrivateKey } from '../crypto';
import * as https from 'https';
import chalk from 'chalk';
import { runGoloopCmd } from '../goloop';
import { KeyStore } from '../types';
import { decipherKeyStore } from './keystore';

export default class Wallet {
    private _privKey: Buffer;
  
    private address: string;
  
    private uri: string;
  
    private url: string;
  
    private projectPath: string;
  
    constructor(projectPath: string, privKey: Buffer, network: string) {
      if (!privKey) {
        throw new Error('A private key must be supplied to the constructor.');
      }
  
      if (privKey && !isPrivateKey(privKey)) {
        throw new Error(`[${privKey}] is not a valid private key.`);
      }
  
      this._privKey = privKey;
      let pubKey = secp256k1.getPublicKey(this._privKey, false).slice(1);
      let address = createHash('sha3-256')
        .update(pubKey)
        .digest('hex')
        .slice(-40);
  
      this.address = addHxPrefix(address);
  
      this.url = `https://lisbon.tracker.solidwallet.io/v3/address/info?address=${this.address}`;
      this.uri = network;
      this.projectPath = projectPath;
    }
  
    static create(projectPath: string,  network: string): Wallet {
        let privKey: Buffer = Buffer.from(secp256k1.utils.randomPrivateKey())
        return new Wallet(projectPath, privKey, network);
    }

    setURI(uri: string) {
      this.uri = uri;
    }
    
    static async loadKeyStore(
      projectPath: string,
      network: string,
      keystore: KeyStore,
      password: string,
    ): Promise<Wallet> {
      const seed = await decipherKeyStore(keystore, password);
  
      return new Wallet(projectPath, seed as any, network);
    }

    /*
     * Get EOA address of wallet instance.
     */
    public getAddress(): string {
      return this.address;
    }
  
    async getInfo(): Promise<any> {
      const resp = await this.request(this.url);
      const walletInfo = JSON.parse(resp);
  
      if (walletInfo.result == '200') {
        const data = walletInfo.data;
        return data;
      } else {
        panic(`No data found for Wallet ${chalk.red(this.address)}`);
      }
    }
  
    async getBalance(): Promise<BigInt> {
      const command = `goloop rpc balance ${this.address} --uri ${this.uri}`;
  
      return new Promise(resolve => {
        runGoloopCmd(this.projectPath, command, (output: string) => {
          let balance = output.replace(/[^\w\s]/gi, '');
          let balanceFloat = BigInt(balance);
          resolve(balanceFloat);
        });
      });
    }
  
    async getBalanceUsd(): Promise<number> {
      const data = await this.getInfo();
      return parseFloat(data.icxUsd);
    }
  
    async showBalances() {
      await this.getBalance().then(balance => {
        this.display('Balance (ICX) :   ', balance);
      });
    }
  
    display(prefix: string, number: BigInt) {
      const divisor = 10 ** 18;
      const numberFormatted = (Number(number) / Number(divisor)).toLocaleString(
        'en-US',
        { minimumFractionDigits: 4, maximumFractionDigits: 4 }
      );
      console.log(`${prefix} ${chalk.green(numberFormatted)}`);
    }

    async  request(url: string): Promise<string> {
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
    
    // TODO: implement local/tesnet airdrop 
    async airdrop(amount: number) {

    }
  }
