import { USDC, RandomC } from "../mint/Mints";
import { Account } from "../account/Account";
import * as splToken from "@solana/spl-token";
import { connection } from "../connection/Connection";


async function testPayerOfMintToken() {
    let payer1: Account = Account.getAccountFromKeypairJson("keypair/1.json");
    let payer2: Account = Account.getAccountFromKeypairJson("keypair/2.json");
    let receiver: Account = Account.getAccountFromKeypairJson("keypair/receiverAccount.json");

    let mintToken = new splToken.Token(
        connection,
        RandomC,
        splToken.TOKEN_PROGRAM_ID,
        payer1.getKeypair()
    );

    await payer1.setMintToken(mintToken);
    await receiver.setMintToken(mintToken);
    await payer1.transferTokenAndReceiverPayFee(receiver, 1);
}

testPayerOfMintToken();