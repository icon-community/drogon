import { panic } from '../helpers';
import crypto from 'crypto';
import { scrypt } from 'ethereum-cryptography/scrypt';
import { keccak256 } from 'ethereum-cryptography/keccak';
import { bytesToHex } from 'ethereum-cryptography/utils';
import { IsString } from '../crypto';
import { KeyStore } from '../types';
import { runGoloopCmd } from '../goloop';
import * as fs from 'fs';

export function keyStoreFromString(keystoreString: string): KeyStore {
  let data: any;

  try {
    data = JSON.parse(keystoreString);
  } catch (e) {
    throw new Error("Invalid JSON string");
  }

  // Validate the structure of the KeyStore
  if (!data.address || !data.id || !data.version || !data.coinType || !data.crypto) {
    throw new Error("Invalid KeyStore structure");
  }
  if (data.coinType !== 'icx') {
    throw new Error("Invalid CoinType");
  }

  if (!data.crypto.cipher || !data.crypto.cipherparams || !data.crypto.ciphertext ||
    !data.crypto.kdf || !data.crypto.kdfparams || !data.crypto.mac) {
    throw new Error("Invalid Crypto structure");
  }

  if (!data.crypto.cipherparams.iv ||
    !data.crypto.kdfparams.dklen || !data.crypto.kdfparams.n ||
    !data.crypto.kdfparams.r || !data.crypto.kdfparams.p ||
    !data.crypto.kdfparams.salt) {
    throw new Error("Invalid Crypto Params structure");
  }
  
  const keystore: KeyStore = data as KeyStore;

  if (keystore.version !== 3) {
    throw new Error('This is not a V3 wallet.');
  }

  if (keystore.crypto.kdf === 'pbkdf2') {
    let kdfparams = keystore.crypto.kdfparams;

    if (kdfparams.prf !== 'hmac-sha256') {
      throw new Error("It's an unsupported parameters to PBKDF2.");
    }
    if (!keystore.crypto.kdfparams.c) {
      throw new Error("Invalid PBKDF2 structure - 'c' parameter is missing");
    }
  } else {
    throw new Error("It's an unsupported key derivation scheme.");
  }
  return keystore;
}

export async function decipherKeyStore(keystore: KeyStore, password: string) {
  
  if (!IsString(password)) {
    panic('Password is invalid.');
  }

  let derivedKey: any;
  let kdfparams: any;
  if (keystore.crypto.kdf === 'scrypt') {
    kdfparams = keystore.crypto.kdfparams;
    derivedKey = await scrypt(
      Buffer.from(password) as any,
      Buffer.from(kdfparams.salt, 'hex') as any,
      kdfparams.n,
      kdfparams.p,
      kdfparams.r,
      kdfparams.dklen
    );
  } else if (keystore.crypto.kdf === 'pbkdf2') {
    kdfparams = keystore.crypto.kdfparams;

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

  const ciphertext = Buffer.from(keystore.crypto.ciphertext, 'hex');
  const mac = keccak256(Buffer.concat([derivedKey.slice(16, 32), ciphertext]));

  if (bytesToHex(mac) !== keystore.crypto.mac) {
    panic('Key derivation is failed (possibly wrong passphrase).');
  }

  const decipher = crypto.createDecipheriv(
    keystore.crypto.cipher,
    derivedKey.slice(0, 16),
    Buffer.from(keystore.crypto.cipherparams.iv, 'hex')
  );

  const seed = Buffer.concat([decipher.update(ciphertext), decipher.final()]);

  return seed;
}

export function keyStoreFileNameForIndex(index: number): string {
  return `.drogon/sandbox/keystore${index}.json`;
}

export async function generateKeyStore (projectPath: string, keystoreIndex: number): Promise<string>  {
  const command = `goloop ks gen --out /goloop/app/${keyStoreFileNameForIndex(keystoreIndex)}`;
  return new Promise((resolve, reject) => {
    runGoloopCmd(projectPath, command, (output: any, error: any) => {
      if (error) {
        reject(error);
      } else {
        resolve(keyStoreFileNameForIndex(keystoreIndex));
      }
    });
  });
}

export async function copyKeyStore(projectPath: string, keystoreIndex: number): Promise<void> {
  return new Promise((resolve, reject) => {
    fs.copyFile(
      `${projectPath}/.keystore.json`,
      `${projectPath}/${keyStoreFileNameForIndex(keystoreIndex)}`,
      err => {
        if (err) reject(err);
        else resolve();
      }
    );
  });
}