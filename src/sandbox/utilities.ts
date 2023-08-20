const nodeDetails = {
    name: "local-node",
    country: "NL",
    city: "Amsterdam",
    email: "info@drogon.io",
    website: "https://drogon.io",
    details: "https://drogon.io/details.json",
    p2pEndpoint: "127.0.0.1:9000",
    nodeAddress: ""
};

export interface RegisterNodeArgs  {
    NodeIndex : number
    NodeAddress : string
    Wallet  : string
    P2PEndPoint: string
    Score: string
    NID: string
}

const registerNode = async (args: RegisterNodeArgs) => {
    let details = nodeDetails
    details.name = details.name+args.NodeIndex

    details.p2pEndpoint = args.P2PEndPoint
    details.nodeAddress = args.NodeAddress

    console.log(`Registering Prep => ${details.name}`);
}
