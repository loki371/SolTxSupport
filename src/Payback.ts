import fs from "fs";
import { USDC, USDC_unit } from "./mint/Mints";
import { Account } from "./account/Account";
import * as splToken from "@solana/spl-token";
import { connection } from "./connection/Connection";
import { parse } from "csv-parse";
import * as retryTx from "./transaction/RetryTransaction";

// ------------------------------------------------------------------------------------------------
// input 

let accCSVPath = "input/Payback_100.csv";
let errorInitCsv = "output/ErrorInit.csv";
let errorTransferCsv = "output/TranferToken.csv";
let errorUnMinCsv = "output/UnMintToken.csv";

let amountTransfer: number = 25 * USDC_unit;

let keypairPath = "keypair/";

let zeroSolAccount = Account.getAccountFromKeypairJson(keypairPath + "zeroSol.json");
let receiverAccounts: Array<Account> = [
    Account.getAccountFromKeypairJson(keypairPath + "sender.json")
];

let payerList: Array<Account> = new Array();
for (let i = 1; i <= 21; ++i) {
    let payer = retryTx.getAccountFromKeyPairPath(keypairPath, i);
    payerList.push(payer);
}

// ------------------------------------------------------------------------------------------------
const parser = parse({
    delimiter: ',',
    skip_empty_lines: true
});


let stringKeys: Array<string> = new Array();
fs.createReadStream(accCSVPath)
    .pipe(parser)
    .on('data', function (csvrow) {
        stringKeys.push(csvrow[1]);
    })
    .on('end', async function () {

        let counter = 0;
        let itemPerCount = stringKeys.length / receiverAccounts.length;

        console.log();
        console.log("*itemPerCount = " + itemPerCount);

        for (let receiverAccount of receiverAccounts) {
            console.log();
            console.log("** Process Batch with Counter = " + counter + " / " + stringKeys.length);

            payerList = new Array<Account>();

            console.log("- receiver = " + receiverAccount.getPublicKey());

            // deny create new AssociateTokenAccount
            let mintToken: splToken.Token = new splToken.Token(
                connection,
                USDC,
                splToken.TOKEN_PROGRAM_ID,
                zeroSolAccount.getKeypair()
            );
            await receiverAccount.setMintToken(mintToken);

            // int all account with mint
            let strKeypairs = stringKeys.slice(counter, counter + itemPerCount);
            await retryTx.initPayerListAndSetMint(payerList, mintToken, strKeypairs, errorInitCsv);
            console.log("finish update paybackList, payback.size =  " + payerList.length + "\n");

            // payback all token
            await retryTx.transferToken(payerList, receiverAccount, amountTransfer, errorTransferCsv);
            console.log("finish payback Token, payback.size = " + payerList.length + "\n");
           
            // set payer for remove account
            mintToken = new splToken.Token(
                connection,
                USDC,
                splToken.TOKEN_PROGRAM_ID,
                receiverAccount.getKeypair()
            );
            await receiverAccount.setMintToken(mintToken);
            await retryTx.setMintToken(payerList, mintToken);

            // unmint all account
            await retryTx.unMintAllPayback(payerList, receiverAccount, errorUnMinCsv);
            console.log("\nfinish unMint Token, payback.size = " + payerList.length + "\n");

            counter += itemPerCount;
        }
    });