const { getAccountSyncFromKeypair } = require("./utils/account");
const { mintPubkey, createNewMintAddress } = require("./utils/mintToken");
const { transferToken, requestAirdrop } = require("./utils/transaction");


let payer = getAccountSyncFromKeypair("./json/keypair1.json");


// transfer new Token
let amountSupply = 10000;
let mintPubkey2 = createNewMintAddress(payer, amountSupply); 