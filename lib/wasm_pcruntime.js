/*
 * SPDX-License-Identifier: Apache-2.0
 */

const util = require('util');
const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const {Arguments, Return} = require('../protos/compiled.js').datatypes;


class Wasm_PcRuntime {

    constructor(filename, log) {
        this.log=log;
        this.log(`Loading wasm code from ${filename}`);
        this.source = fs.readFileSync(path.resolve(filename));
        this.cachegetUint8Memory0 = null;
    }

    getUint8Memory0() {
        if (this.cachegetUint8Memory0 === null || this.cachegetUint8Memory0.buffer !== this.wasmMemory.buffer) {
            this.cachegetUint8Memory0 = new Uint8Array(this.wasmMemory.buffer);
        }
        return this.cachegetUint8Memory0;
    }

    async start() {
        const env = {
            __memory_base: 0,
            tableBase: 0,
            memory: new WebAssembly.Memory({
                initial: 256
            }),
            table: new WebAssembly.Table({
                initial: 0,
                element: 'anyfunc'
            }), 'wapc':this.wapc
        };

        this.cachedTextDecoder = new util.TextDecoder('utf-8', {ignoreBOM: true, fatal: true});
        const typedArray = new Uint8Array(this.source);

        this.wasm = await WebAssembly.instantiate(typedArray, {
            env: env,
            'wapc': {
                '__guest_request': (op_ptr, param_ptr) => {
                    this.log('__guest_request');
                    this.getUint8Memory0().subarray(op_ptr, op_ptr + this.currentFnname.length).set(this.currentFnname);
                    this.getUint8Memory0().subarray(param_ptr, param_ptr + this.currentBuffer.length).set(this.currentBuffer);
                    return 0;
                },
                '__guest_error': (ptr, len) => {
                    // this is a protobuf to be unwrapped
                    let retval = Return.decode(this.getUint8Memory0().subarray(ptr, ptr + len),len);
                    this.callCtx.reject(retval);
                    // const result = this.cachedTextDecoder.decode(this.getUint8Memory0().subarray(ptr, ptr + len));
                    // console.log(chalk.keyword('orange')('[rust] ' + result));
                    return 1;
                },
                '__guest_response': (ptr, len) => {
                    // this is a protobuf to be unwrapped
                    let retval = Return.decode(this.getUint8Memory0().subarray(ptr, ptr + len),len);
                    this.callCtx.resolve(retval);
                    // const result = this.cachedTextDecoder.decode(this.getUint8Memory0().subarray(ptr, ptr + len));
                    // console.log(chalk.keyword('orange')('[rust] ' + result));
                    return 1;
                },
                '__host_call': (ns_ptr, ns_len, op_ptr, op_len, ptr, len) => {
                    const ns = this.cachedTextDecoder.decode(this.getUint8Memory0().subarray(ns_ptr, ns_ptr + ns_len));
                    const op = this.cachedTextDecoder.decode(this.getUint8Memory0().subarray(op_ptr, op_ptr + op_len));
                    const data = this.cachedTextDecoder.decode(this.getUint8Memory0().subarray(ptr, ptr + len));
                    this.log(`___host_call ${ns} ${op} ${data}`);
                    return 1;
                },
                '__host_response_len': () => {
                    this.log('__host_response_len');
                    return 'Hello from Ferric Oxide!'.length;
                },
                '__host_response': (ptr) => {
                    this.getUint8Memory0().subarray(ptr, ptr + 'Hello from Ferric Oxide!'.length).set(Buffer.from('Hello from Ferric Oxide!', 'utf-8'));
                    this.log(`__host_response ${ptr}`);
                },
                '__host_error_len': () => {
                    return 42;
                },
                '__host_error': (error) => {
                    console.log(chalk.redBright('[rust] ' + error));
                },
                '__log':(ptr, len) => {
                    const result = this.cachedTextDecoder.decode(this.getUint8Memory0().subarray(ptr, ptr + len));
                    console.log(chalk.keyword('orange')('[rust] ' + result));
                },
                '__console_log': (ptr, len) => {
                    const result = this.cachedTextDecoder.decode(this.getUint8Memory0().subarray(ptr, ptr + len));
                    console.log(chalk.keyword('orange')('[rust] ' + result));
                }
            }
        });

        this.wasmMemory = this.wasm.instance.exports.memory;

        // test the logging actually works
        // this.wasm.instance.exports.invoke_log();
        return this;
    }

    async call(fnname, buffer) {
        const fnnameBuffer = Buffer.from(fnname, 'utf-8');
        this.log(`${fnname} ${buffer.length}`);

        this.currentFnname = fnnameBuffer;
        this.currentBuffer = buffer;
        this.callCtx = {};
        this.callCtx.p = new Promise((resolve,reject)=>{
            this.callCtx.resolve = resolve;
            this.callCtx.reject = reject;
        });
        const rc = this.wasm.instance.exports.__guest_call(fnnameBuffer.length, buffer.length);
        return this.callCtx.p;
    }

    async launch() {
        const rc = this.wasm.instance.exports.__launch();
        return rc;
    }
}

module.exports = Wasm_PcRuntime;
