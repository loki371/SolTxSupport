import { USDC, RandomC } from "./mint/Mints";
import { Account } from "./account/Account";
import * as splToken from "@solana/spl-token";
import { connection } from "./connection/Connection";

let HEAD_PATH = "transfer-many-acc"

async function testPayerOfMintToken() {
    let payer1: Account = Account.getAccountFromKeypairJson(HEAD_PATH + "/keypair/1.json");
    let payer2: Account = Account.getAccountFromKeypairJson(HEAD_PATH + "/keypair/2.json");
    let receiver: Account = Account.getAccountFromKeypairJson(HEAD_PATH + "/keypair/3.json");

    let mintToken = new splToken.Token(
        connection,
        RandomC,
        splToken.TOKEN_PROGRAM_ID,
        payer1.getKeypair()
    );

    await payer1.setMintToken(mintToken);
    await payer2.setMintToken(mintToken);

    await payer2.transferToken(receiver.getPublicKey(), 1);
}

testPayerOfMintToken();