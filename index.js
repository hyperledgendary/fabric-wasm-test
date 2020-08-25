/*
 * SPDX-License-Identifier: Apache-2.0
 */
'use strict';

const chalk = require('chalk');
const WasmRuntime = require('./lib/wasm_pcruntime');
const { contract_messages , common_messages } = require('fabric-ledger-protos-node');

const log = (...args) => {
    console.log(chalk.blueBright(`[host] ${args}`));
};

const run = async (pathname) => {
    if (!pathname) {
        throw new Error('Need a filename');
    }
    const runtime = new WasmRuntime(pathname, log);
    await runtime.start();
    log('Runtime started');
    log('Exported functions are: ' + Object.keys(runtime.wasm.instance.exports).reduce((c, e) => `${c}   ${e}`));

    // pass the first invoke transaction request
    const itr = new contract_messages.InvokeTransactionRequest();

    itr.setTransactionName('AssetContract:create_asset');
    let args = [];
    args.push(Buffer.from("007"));
    args.push(Buffer.from('Bond, James Bond'));
    itr.setArgsList(args);
    
    const ctx = new common_messages.TransactionContext();

    ctx.setChannelId('mychannel');
    ctx.setTransactionId('0xCAFEBABE');
    itr.setContext(ctx)
    
    runtime.call('InvokeTransaction', Buffer.from(itr.serializeBinary()));
};

module.exports.run = run;
module.exports.log = log;