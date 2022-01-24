import fs from "fs";
import { USDC, USDC_unit, RandomC } from "../mint/Mints";
import { Account } from "../account/Account";
import { parse } from "csv-parse";


let accCSVPath = "input/Payback_.csv";

const parser = parse({
    delimiter: ',',
    skip_empty_lines: true
});

let totalAccount = 0;

fs.createReadStream(accCSVPath)
    .pipe(parser)
    .on('data', function (csvrow) {
        try {
            let keypair = JSON.parse("[" + csvrow[1] + "]");
            let account = new Account(keypair);
            console.log("accountPubkey = " + account.getPublicKey());
            console.log("csv    Pubkey = " + csvrow[0]);
            console.log();
            totalAccount += 1;
        } catch(err) {
            console.log(err);
        }
        
    })
    .on('end', function () {
        console.log("total success acc = " + totalAccount);
    });