import { Account, Chain, IGenesis } from "../types";
export class Genesis implements IGenesis {
    accounts: Account[];
    chain: Chain;
    message: string;
    nid: string;

    constructor(data: IGenesis) {
        this.accounts = data.accounts;
        this.chain = data.chain;
        this.message = data.message;
        this.nid = data.nid;
    }

    static fromJson(jsonString: string): Genesis {
        const data = JSON.parse(jsonString) as IGenesis;
        return new Genesis(data);
    }

    static default(): Genesis {
        return new Genesis({
            accounts: [
                {
                    address: "hxb6b5791be0b5ef67063b3c10b840fb81514db2fd",
                    balance: "0x2961fff8ca4a62327800000",
                    name: "god"
                },
                {
                    address: "hx1000000000000000000000000000000000000000",
                    balance: "0x0",
                    name: "treasury"
                },
                {
                    address: "cx0000000000000000000000000000000000000001",
                    name: "governance",
                    score: {
                        contentId: "hash:{{hash:gov/governance-2.1.3-optimized.jar}}",
                        contentType: "application/java",
                        owner: "hxb6b5791be0b5ef67063b3c10b840fb81514db2fd"
                    }
                }
            ],
            chain: {
                revision: "0x13",
                blockInterval: "0x3e8",
                fee: {
                    stepPrice: "0x2e90edd00",
                    stepLimit: {
                        invoke: "0x9502f900",
                        query: "0x2faf080"
                    },
                    stepCosts: {
                        apiCall: "0x2710",
                        contractCall: "0x61a8",
                        contractCreate: "0x3b9aca00",
                        contractSet: "0x3a98",
                        contractUpdate: "0x3b9aca00",
                        default: "0x186a0",
                        delete: "-0xf0",
                        deleteBase: "0xc8",
                        get: "0x19",
                        getBase: "0xbb8",
                        input: "0xc8",
                        log: "0x64",
                        logBase: "0x1388",
                        schema: "0x1",
                        set: "0x140",
                        setBase: "0x2710"
                    }
                },
                validatorList: []
            },
            message: "genesis for local gochain nodes",
            nid: "0x3",
        });
    }

    toJson(): string {
        return JSON.stringify(this);
    }

    getGodWallet(): Account {

        const godWallet = this.accounts.find(acc => acc.name === 'god');

        if (!godWallet) {
            throw new Error('God wallet not found');
        }

        return godWallet;
    }

    getTreasuryWallet(): Account {

        const treasuryWallet = this.accounts.find(acc => acc.name === 'treasury');

        if (!treasuryWallet) {
            throw new Error('Treasury wallet not found');
        }

        return treasuryWallet;
    }
    getGovernanceWallet(): Account {

        const governanceWallet = this.accounts.find(acc => acc.name === 'governance');

        if (!governanceWallet) {
            throw new Error('Governance wallet not found');
        }

        return governanceWallet;
    }
}
