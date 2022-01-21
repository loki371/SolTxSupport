
import fs from "fs";
import { USDC, USDC_unit, RandomC } from "./mint/Mints";
import { Account } from "./account/Account";
import * as splToken from "@solana/spl-token";
import { connection } from "./connection/Connection";
import { parse } from "csv-parse";


let accountInfoCsv = "transfer-many-acc/output_total/AccountInfo.csv";
let transferTokenCsv = "transfer-many-acc/output_total/TranferToken.csv";
let unMinTokenCsv = "transfer-many-acc/output_total/UnMintToken.csv";
let successCsv = "transfer-many-acc/output_total/success.csv";


let amountTransfer: number = 200 * USDC_unit;
let receiver = Account.getAccountFromKeypairJson("transfer-many-acc/keypair/sender.json");
let keypairPath = "transfer-many-acc/keypair/receiver";

let paybackList: Array<Account> = new Array();
for (let i = 2; i <= 21; ++i) {
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

    await paybackToken(receiver);
    console.log("\nfinish payback Token, payback.size = " + paybackList.length + "\n");

    await unMintAllPayback(receiver);
    console.log("\nfinish unMint Token, payback.size = " + paybackList.length + "\n");

    updateSuccessCsv();

}
run();


// -------------------------------------------------------------------------------------------------------------------------------------------------------------
async function updatePaybackList(mintToken: splToken.Token, strKeypairs: Array<string>) {
    console.log("* Start: updatePaybackList");

    let counter = 0;
    let size = strKeypairs.length;

    let removeAccounts = new Array<Account>();
    for (let strKeypair of strKeypairs) {
        console.log((++counter) + "/" + size);

        let keypair = JSON.parse("[" + strKeypair + "]");
        let payer: Account = new Account(keypair);
        let isValid: boolean = await payer.setMintToken(mintToken);

        let updateResult: boolean;
        if (isValid) {
            paybackList.push(payer);
            updateResult = true;
        } else {
            removeAccounts.push(payer);
            updateResult = false;
        }
        logUpdatePayback(payer, updateResult);
    }

    for (let account of removeAccounts)
        removeAccountFromPaybackList(account);
}

function logUpdatePayback(account: Account, res: boolean) {
    if (res == true)
        return;
    fs.writeFileSync(
        accountInfoCsv,
        transferAccountToCsvRow(account, res), {
        flag: "a"
    });
}

// -------------------------------------------------------------------------------------------------------------------------------------------------------------
async function paybackToken(receiverAccount: Account) {
    console.log("* Start: paybackToken");

    let counter = 0;
    let size = paybackList.length;

    let removeAccounts = new Array<Account>();
    for (let account of paybackList) {
        console.log((++counter) + "/" + size);

        let updateResult: boolean;
        try {
            await account.transferTokenAndReceiverPayFee(receiverAccount, amountTransfer);
            updateResult = true;
        } catch (err) {
            console.log(err);
            removeAccounts.push(account);
            updateResult = false;
        }
        logErrorTransferToken(account, updateResult);
    }

    for (let account of removeAccounts)
        removeAccountFromPaybackList(account);
}

function logErrorTransferToken(account: Account, res: boolean) {
    if (res == true)
        return;
    fs.writeFileSync(
        transferTokenCsv,
        transferAccountToCsvRow(account, res), {
        flag: "a"
    });
}

// -------------------------------------------------------------------------------------------------------------------------------------------------------------
async function unMintAllPayback(receiverAccount: Account) {
    console.log("* Start: unMintAllPaypack");

    let counter = 0;
    let size = paybackList.length;

    let removeAccounts = new Array<Account>();
    for (let account of paybackList) {
        console.log((++counter) + "/" + size);

        let updateResult: boolean;
        try {
            await account.unMint(receiverAccount.getPublicKey());
            updateResult = true;
        } catch (err) {
            console.log(err);
            removeAccounts.push(account);
            updateResult = false;
        }
        logUnMintAccount(account, updateResult);
    }

    for (let account of removeAccounts)
        removeAccountFromPaybackList(account);
}

function logUnMintAccount(account: Account, res: boolean) {
    if (res == true)
        return;
    fs.writeFileSync(
        unMinTokenCsv,
        transferAccountToCsvRow(account, res), {
        flag: "a"
    });
}

// -------------------------------------------------------------------------------------------------------------------------------------------------------------
function removeAccountFromPaybackList(account: Account) {
    let indexOfAcc = paybackList.indexOf(account);
    paybackList.splice(indexOfAcc, 1);
}


function transferAccountToCsvRow(account: Account, res: boolean): string {
    return account.getPublicKey()
        + ",\""
        + account.getKeypair().secretKey.toString()
        + "\"\n";
}


function updateSuccessCsv() {
    for (let account of paybackList)
        fs.writeFileSync(
            successCsv,
            transferAccountToCsvRow(account, true), {
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