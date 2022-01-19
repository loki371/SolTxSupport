import fs from "fs";
import { USDC, USDC_unit, RandomC } from "./mint/Mints";
import { Account } from "./account/Account";
import * as splToken from "@solana/spl-token";
import { connection } from "./connection/Connection";
import { parse } from "csv-parse";
import * as web3 from "@solana/web3.js";


let accCSVPath = "transfer-many-acc/input/Payback.csv";
let accountInfoCsv = "transfer-many-acc/output/AccountInfo.csv";
let transferFeeCsv = "transfer-many-acc/output/TransferFee.csv";
let transferTokenCsv = "transfer-many-acc/output/TranferToken.csv";
let unMinTokenCsv = "transfer-many-acc/output/UnMintToken.csv";
let successCsv = "transfer-many-acc/output/success.csv";


// let amountTransfer: number = 10 * USDC_unit;
let amountTransfer: number = 1;
let feePerTransaction = 0.32;

let payerForMint = Account.getAccountFromKeypairJson("transfer-many-acc/keypair/payerForMint.json");
let receiverAccount = Account.getAccountFromKeypairJson("transfer-many-acc/keypair/receiverAccount.json");


let mintToken = new splToken.Token(
    connection,
    RandomC,
    splToken.TOKEN_PROGRAM_ID,
    payerForMint.getKeypair()
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
        strKeypairs.push(csvrow[0]);
    })
    .on('end', async function () {

        await updatePaybackList();
        console.log("finish update paybackList, payback.size =  " + paybackList.length + "\n");

        // await sendFeeForPayers();
        // console.log("finish sendFee for payer, payback.size = " + paybackList.length + "\n");

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

        let keypair = JSON.parse(strKeypair);
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
async function sendFeeForPayers() {
    console.log("* Start: sendFeeForPayer");

    let counter = 0;
    let size = paybackList.length;
    let removeAccounts = new Array<Account>();
    for (let account of paybackList) {
        console.log((++counter) + "/" + size);

        let updateResult: boolean;
        try {
            await receiverAccount.transferSolana(
                account.getPublicKey(), 
                feePerTransaction
            );
            updateResult = true;
        } catch (err) {
            removeAccounts.push(account);
            updateResult = false;
        }
        logSendFeeForPayer(account, updateResult);
    }

    for (let account of removeAccounts)
        removeAccountFromPaybackList(account);
}

function logSendFeeForPayer(account: Account, res: boolean) {
    fs.writeFileSync(
        transferFeeCsv,
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