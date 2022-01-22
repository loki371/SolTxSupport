
import fs from "fs";
import { USDC, USDC_unit, RandomC } from "./mint/Mints";
import { Account } from "./account/Account";
import * as splToken from "@solana/spl-token";
import { connection } from "./connection/Connection";
import { parse } from "csv-parse";


let transferTokenCsv = "transfer-many-acc/output_total/TranferToken.csv";
let unMinTokenCsv = "transfer-many-acc/output_total/UnMintToken.csv";
let successCsv = "transfer-many-acc/output_total/success.csv";


let amountTransfer: number = 200 * USDC_unit;
let receiver = Account.getAccountFromKeypairJson("transfer-many-acc/keypair/sender.json");
let keypairPath = "transfer-many-acc/keypair/receiver";

let paybackList: Array<Account> = new Array();
for (let i = 1; i <= 21; ++i) {
    let payer = getAccountFromKeyPairPath(i);
    paybackList.push(payer);
}

async function run() {
    console.log("- receiver = " + receiver.getPublicKey());

    let mintToken: splToken.Token = new splToken.Token(
        connection,
        USDC,
        splToken.TOKEN_PROGRAM_ID,
        receiver.getKeypair()
    );

    receiver.setMintToken(mintToken);
    for (let payer of paybackList) 
        payer.setMintToken(mintToken);

    // await paybackToken(receiver);
    // console.log("\nfinish payback Token, payback.size = " + paybackList.length + "\n");

    await unMintAllPayback(receiver);
    console.log("\nfinish unMint Token, payback.size = " + paybackList.length + "\n");

    updateSuccessCsv();
}

run();


// -------------------------------------------------------------------------------------------------------------------------------------------------------------
async function paybackToken(receiverAccount: Account) {
    console.log("* Start: paybackToken");

    let size;
    let removeAccounts: Array<Account>;
    let tryCount = 0;

    while (paybackList.length != 0) {

        size = paybackList.length;
        removeAccounts = new Array();

        tryCount += 1;
        console.log("- TryCount = " + tryCount);

        let counter = 0;
        for (let account of paybackList) {

            console.log((++counter) + "/" + size);

            await account.transferTokenAndReceiverPayFee(receiverAccount, amountTransfer)
            .then(() => {
                console.log("   finsh success => remove from list");
                removeAccounts.push(account);
            })
            .catch(reason => {
                console.log("   error with reason = " + JSON.stringify(reason));
                if (Object.keys(reason).length == 0) {
                    console.log("   => try again");
                } else {
                    console.log("   => remove from list");
                    removeAccounts.push(account);
                    logErrorTransferToken(account);
                }
            });
        }

        for (let account of removeAccounts)
            removeAccountFromPaybackList(account);

    } 
}

function logErrorTransferToken(account: Account) {
    fs.writeFileSync(
        transferTokenCsv,
        transferAccountToCsvRow(account), {
        flag: "a"
    });
}

// -------------------------------------------------------------------------------------------------------------------------------------------------------------
async function unMintAllPayback(receiverAccount: Account) {
    console.log("* Start: unMintAllPaypack");

    let size;
    let removeAccounts: Array<Account>;
    let tryCount = 0;

    while (paybackList.length != 0) {
        size = paybackList.length;
        removeAccounts = new Array();

        tryCount += 1;
        console.log("- TryCount = " + tryCount);

        let counter = 0;
        for (let account of paybackList) {

            console.log((++counter) + "/" + size);

            await account.unMint(receiverAccount.getPublicKey())
            .then(() => {
                console.log("   finsh success => remove from list");
                removeAccounts.push(account);
            })
            .catch(reason => {
                console.log("   error with reason = " + JSON.stringify(reason));
                if (Object.keys(reason).length == 0) {
                    console.log("   => try again");
                } else {
                    console.log("   => remove from list");
                    removeAccounts.push(account);
                    logErrorUnMintAccount(account);
                }
            });
        }

        for (let account of removeAccounts)
            removeAccountFromPaybackList(account);

    } 
}

function logErrorUnMintAccount(account: Account) {
    fs.writeFileSync(
        unMinTokenCsv,
        transferAccountToCsvRow(account), {
        flag: "a"
    });
}

// -------------------------------------------------------------------------------------------------------------------------------------------------------------
function removeAccountFromPaybackList(account: Account) {
    let indexOfAcc = paybackList.indexOf(account);
    paybackList.splice(indexOfAcc, 1);
}


function transferAccountToCsvRow(account: Account): string {
    return account.getPublicKey()
        + ",\""
        + account.getKeypair().secretKey.toString()
        + "\"\n";
}


function updateSuccessCsv() {
    for (let account of paybackList)
        fs.writeFileSync(
            successCsv,
            transferAccountToCsvRow(account), {
            flag: "a"
        });
}

function getKeypairPath(i: number) {
    return keypairPath + i + ".json";
}

function getAccountFromKeyPairPath(i: number): Account {
    return Account.getAccountFromKeypairJson(
        getKeypairPath(i)
    );
}