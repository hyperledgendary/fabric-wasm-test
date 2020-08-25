#!/usr/bin/env node
// SPDX-License-Identifier: Apache-2.0

const testruntime = require('../index.js');

let yargs = require('yargs')
  .scriptName("fwt")
  .usage('$0 <cmd> [args]')
  .command('run [wasmfile]', 'run the wasm contract code give', (yargs) => {
    yargs.positional('wasmfile', {
      type: 'string',
      default: '',
      describe: 'the path to the wasm file needed'
    })
  }, function (argv) {
    return testruntime.run(argv.wasmfile).then().catch(error => {
      console.log(error);
    });
  })
  .demandCommand()
  .help()
  .argv