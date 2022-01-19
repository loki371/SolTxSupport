import { USDC, RandomC } from "../mint/Mints";
import { Account } from "../account/Account";
import * as splToken from "@solana/spl-token";
import { connection } from "../connection/Connection";

let HEAD_PATH = "transfer-many-acc"

async function testAirdrop() {
    let payer1: Account = Account.getAccountFromKeypairJson(HEAD_PATH + "/keypair/1.json");
    let payer2: Account = Account.getAccountFromKeypairJson(HEAD_PATH + "/keypair/2.json");
    let payer3: Account = Account.getAccountFromKeypairJson(HEAD_PATH + "/keypair/3.json");

    // payer1.requestAirdrop();
    payer2.requestAirdrop();
    // payer3.requestAirdrop();
}

testAirdrop();