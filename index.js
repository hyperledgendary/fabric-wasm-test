/*
 * SPDX-License-Identifier: Apache-2.0
 */
'use strict';

const path = require('path');
const chalk = require('chalk');
const WasmRuntime = require('./lib/wasm_pcruntime');
const {Arguments, Return} = require('./protos/compiled.js').datatypes;

const log = (...args)=>{
    console.log(chalk.blueBright(`[host] ${args}`));
}

const run = async (pathname) => {

    const filename = path.resolve(pathname);
    log(`Loading wasm code from ${filename}`);

    const runtime = new WasmRuntime(filename,log);
    await runtime.start();
    log(`Runtime started`);    

    let rc = await runtime.launch();
    log(`Contract launched with rc=${rc}`);

    log('Creating protoBuf for "createAsset()"');
    const params = Arguments.create({fnname:'create_asset', args:['007','Bond, James Bond']});
    const buffer = Arguments.encode(params).finish();

    log(JSON.stringify(params));
    let result = await runtime.call('contract',buffer);
    log(JSON.stringify(result));
};

module.exports.run = run;
module.exports.log = log;