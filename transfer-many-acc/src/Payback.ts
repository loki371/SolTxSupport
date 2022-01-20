import fs from "fs";
import { USDC, USDC_unit, RandomC } from "./mint/Mints";
import { Account } from "./account/Account";
import * as splToken from "@solana/spl-token";
import { connection } from "./connection/Connection";
import { parse } from "csv-parse";


let accCSVPath = "transfer-many-acc/input/Payback_1.csv";
let accountInfoCsv = "transfer-many-acc/output/AccountInfo.csv";
let transferTokenCsv = "transfer-many-acc/output/TranferToken.csv";
let unMinTokenCsv = "transfer-many-acc/output/UnMintToken.csv";
let successCsv = "transfer-many-acc/output/success.csv";


let amountTransfer: number = 10 * USDC_unit;

let receiverAccount = Account.getAccountFromKeypairJson("transfer-many-acc/keypair/receiver1.json");
console.log("receiver PublicKey = " + receiverAccount.getPublicKey());

let mintToken = new splToken.Token(
    connection,
    USDC,
    splToken.TOKEN_PROGRAM_ID,
    receiverAccount.getKeypair()
);


let strKeypairs = new Array<string>();
let paybackList = new Array<Account>();

const parser = parse({
    delimiter: ',',
    skip_empty_lines: true
});


fs.createReadStream(accCSVPath)
    .pipe(parser)
    .on('data', function (csvrow) {
        strKeypairs.push(csvrow[1]);
    })
    .on('end', async function () {

        await updatePaybackList();
        console.log("finish update paybackList, payback.size =  " + paybackList.length + "\n");

        await paybackToken();
        console.log("\nfinish payback Token, payback.size = " + paybackList.length + "\n");

        await unMintAllPayback();
        console.log("\nfinish unMint Token, payback.size = " + paybackList.length + "\n");

        updateSuccessCsv();
    });


// -------------------------------------------------------------------------------------------------------------------------------------------------------------
async function updatePaybackList() {
    console.log("* Start: updatePaybackList");

    let counter = 0;
    let size = strKeypairs.length;

    let removeAccounts = new Array<Account>();
    for (let strKeypair of strKeypairs) {
        console.log((++counter) + "/" + size);

        let keypair = JSON.parse( "[" + strKeypair + "]" );
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
    fs.writeFileSync(
        accountInfoCsv,
        transferAccountToCsvRow(account, res), {
        flag: "a"
    });
}

// -------------------------------------------------------------------------------------------------------------------------------------------------------------
async function paybackToken() {
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
            removeAccounts.push(account);
            updateResult = false;
        }
        logErrorTransferToken(account, updateResult);
    }

    for (let account of removeAccounts)
        removeAccountFromPaybackList(account);
}

function logErrorTransferToken(account: Account, res: boolean) {
    fs.writeFileSync(
        transferTokenCsv,
        transferAccountToCsvRow(account, res), {
        flag: "a"
    });
}

// -------------------------------------------------------------------------------------------------------------------------------------------------------------
async function unMintAllPayback() {
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
            removeAccounts.push(account);
            updateResult = false;
        }
        logUnMintAccount(account, updateResult);
    }

    for (let account of removeAccounts)
        removeAccountFromPaybackList(account);
}

function logUnMintAccount(account: Account, res: boolean) {
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
    return JSON.stringify(res)
        + ", \"["
        + account.getKeypair().secretKey.toString()
        + "]\"\n";
}


function updateSuccessCsv() {
    for (let account of paybackList)
        fs.writeFileSync(
            successCsv,
            transferAccountToCsvRow(account, true), {
            flag: "a"
        });
}