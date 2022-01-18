import { USDC, RandomC } from "./mint/Mints";
import { Account } from "./account/Account";
import * as splToken from "@solana/spl-token";
import { connection } from "./connection/Connection";

let HEAD_PATH = "transfer-many-acc"

let payer: Account = Account.getAccountFromKeypairJson(HEAD_PATH + "/keypair/1.json");
let canceler: Account = Account.getAccountFromKeypairJson(HEAD_PATH + "/keypair/4.json");
let receiver: Account = Account.getAccountFromKeypairJson(HEAD_PATH + "/keypair/5.json"); 

let mintToken = new splToken.Token(
    connection,
    RandomC,
    splToken.TOKEN_PROGRAM_ID,
    payer.getKeypair()
);

async function mintAccount() {
    await payer.setMintToken(mintToken);
    await canceler.setMintToken(mintToken);
}

async function unMintAccount() {
    await canceler.setMintToken(mintToken);
    await canceler.unMint(receiver.getPublicKey());
}

// mintAccount();
unMintAccount();