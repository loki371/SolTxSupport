import { USDC, RandomC } from "../mint/Mints";
import { Account } from "../account/Account";
import * as splToken from "@solana/spl-token";
import { connection } from "../connection/Connection";

let HEAD_PATH = "transfer-many-acc"

async function createNewMintAddress() {
    let payer1: Account = Account.getAccountFromKeypairJson(HEAD_PATH + "/keypair/1.json");
    await payer1.createNewMintAddress(100);
}

createNewMintAddress();