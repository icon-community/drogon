import {secp256k1} from 'ethereum-cryptography/secp256k1';

export function isPrivateKey(privKey: any) {
  if (!privKey) {
    return false;
  }

  if (typeof privKey === 'string') {
    return /^[0-9a-f]{64}$/g.test(privKey) && /\S/g.test(privKey);
  }

  return secp256k1.utils.isValidPrivateKey(Buffer.from(privKey, 'hex'));
}

export const IsString = (value: any) => {
  return typeof value === 'string' || value instanceof String;
};

export function addHxPrefix(str: any): string {
  return addPrefix([isHxPrefix], 'hx', str);
}

export function isHxPrefix(str: string): boolean {
  return /^(hx)/i.test(str);
}

function addPrefix(checkers: any, prefix: string, str: string) {
  for (let i = 0; i < checkers.length; i += 1) {
    if (checkers[i](str)) {
      return str;
    }
  }

  return prefix + str;
}
