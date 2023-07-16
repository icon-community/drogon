export type IconConfig = {
    nid: number;
    channel: string;
    concurrency_level: number;
    db_type: string;
    ee_instances: number;
    ee_socket: string;
    engines: string;
    p2p: string;
    p2p_listen: string;
    role: number;
    rpc_addr: string;
    rpc_debug: boolean;
    rpc_dump: boolean;
    log_level: string;
    seed_addr: string;
    genesis: Genesis;
    chain_dir: string;
    ws_max_session: number;
    key_store: KeyStore;
    consensus: Consensus;
    key_password: string;
    console_level: string;
};

export type Genesis = {
    accounts: Account[];
    chain: Chain;
    message: string;
    nid: string;
};

export type Account = {
    address: string;
    balance: string;
    name: string;
};

export type Chain = {
    validatorList: string[];
    revision: string;
    auditEnabled: string;
    deployerWhiteListEnabled: string;
    fee: Fee;
};

export type Fee = {
    stepPrice: string;
    stepLimit: StepLimit;
    stepCosts: StepCosts;
};

export type StepLimit = {
    invoke: string;
    query: string;
};

export type StepCosts = {
    default: string;
    contractCall: string;
    contractCreate: string;
    contractUpdate: string;
    contractDestruct: string;
    contractSet: string;
    get: string;
    set: string;
    replace: string;
    delete: string;
    input: string;
    eventLog: string;
    apiCall: string;
};

export type KeyStore = {
    version: number;
    id: string;
    address: string;
    crypto: Crypto;
    coinType: string;
};

export type Crypto = {
    cipher: string;
    cipherparams: CipherParams;
    ciphertext: string;
    kdf: string;
    kdfparams: KdfParams;
    mac: string;
};

export type CipherParams = {
    iv: string;
};

export type KdfParams = {
    dklen: number;
    n: number;
    r: number;
    p: number;
    c?: number;
    prf?: string;
    salt: string;
};

export type Consensus = {
    termPeriod: number;
    mainPRepCount: number;
    extraMainPRepCount: number;
    subPRepCount: number;
};
