#!/usr/bin/env node

/**
 * This script allows you to deploy a smart contract to an ethereum-based blockchain of
 * your choosing. The only requirement is that you have an unlocked account on an
 * accessible node with enough ether to cover the gas cost of deployment.
 */

const compile = require('./compile.js');
const fs = require('fs');
const _ = require('lodash');
const net = require('net');
const path = require('path');
const readline = require('readline');
const solc = require('solc');
const Web3 = require('web3');
const yargs = require('yargs');

yargs
    .usage(
        '$0 [--provider-type {ipc|http|ws}] --provider PATH_TO_PROVIDER --contract-file PATH_TO_SOLIDITY_FILE --contract-name CONTRACT_NAME --sender-adress ADDRESS [CONTRACT_ARG ...]',
    )
    .option('provider', {
        alias: 'p',
        describe: 'Resource descriptor for provider: path to IPC socket, or HTTP or websocket URI',
    })
    .option('provider-type', {
        alias: 't',
        describe: 'Type of provider that should be used to connect to ethereum-based node',
        choices: ['ipc', 'http', 'ws'],
    })
    .option('contract-file', {
        alias: 'c',
        describe: 'Path to file containing the solidity smart contract',
    })
    .option('contract-name', {
        alias: 'n',
        describe: 'Name of contract from contract file that you would like to deploy',
    })
    .option('sender-address', {
        alias: 's',
        describe: 'Address of contract creator',
    });

const {
    contractFile,
    contractName,
    provider,
    providerType,
    senderAddress,
} = yargs.argv;

// Contract compilation
console.log(`Compiling contract in ${contractFile}...`);
const contractPath = path.resolve(__dirname, contractFile);
const compilationResult = compile(contractPath);
const compiledContract = _.get(compilationResult, [
    'contracts',
    `${contractPath}:${contractName}`,
]);
const contractBytecode = _.get(compiledContract, 'bytecode');
const preparedContractBytecode = `0x${contractBytecode}`;
console.log('Contract compilation complete!');

// Set up web3 client
console.log(
    `Creating web3 client with provider type: ${providerType}, provider: ${provider}...`,
);
const web3Providers = {
    ipc: Web3.providers.IpcProvider,
    http: Web3.providers.HttpProvider,
    ws: Web3.providers.WebsocketProvider,
};

function makeClient(clientProvider, clientProviderType) {
    if (!clientProviderType) {
        return new Web3(clientProvider);
    }

    if (clientProviderType === 'ipc') {
        return new Web3(new web3Providers[clientProviderType](clientProvider, net));
    }

    return new Web3(new web3Providers[clientProviderType](clientProvider));
}

const web3 = makeClient(provider, providerType);
console.log('Web3 client ready!');

const rawContractArgs = yargs.argv._;
const contractArgs = rawContractArgs.map((arg) => {
    try {
        const listifiedArgs = arg.split(',');
        if (listifiedArgs.length === 1) {
            return listifiedArgs[0];
        }
        return listifiedArgs;
    } catch (e) {
        return arg;
    }
});
console.log(`Contract arguments: ${contractArgs}`);

/**
 * Deploy contract:
 * 1. Estimate gas cost of deployment
 * 2. Prompt user to either confirm inclusion of twice this estimate or include a custom gas amount
 * 3. Attempt contract creation
 * 4. Notify user of success or failure of contract creation
 *
 * This part is asynchronous
 */
console.log('Deploying contract...');
web3.eth.estimateGas({ data: preparedContractBytecode }, (err, gasEstimate) => {
    if (err) {
        throw err;
    }

    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
        prompt: `Gas estimate: ${gasEstimate}. Hit ENTER if you would like to allocate that much gas, or enter a custom amount: `,
    });

    let gasAllocation = gasEstimate;

    rl.once('line', (line) => {
        const trimmedLine = line.trim();

        if (trimmedLine) {
            try {
                gasAllocation = parseInt(line.trim(), 10);
            } catch (e) {
                console.error(`Error: could not parse ${trimmedLine} as an integer`);
                process.exit(1);
            }
        }

        rl.close();
    });

    rl.on('close', () => {
        const web3Contract = web3.eth.contract(
            JSON.parse(_.get(compiledContract, 'interface')),
        );

        return web3Contract.new(
            ...contractArgs,
            {
                from: senderAddress,
                data: preparedContractBytecode,
                gas: gasAllocation,
            },
            (creationErr, contractInstance) => {
                if (creationErr) {
                    throw creationErr;
                }

                if (!contractInstance.address) {
                    return console.log(
                        `Creation transaction: ${contractInstance.transactionHash}`,
                    );
                }

                console.log(
                    `Contract successfully created: ${contractInstance.address}`,
                );
                return web3.eth.getTransactionReceipt(
                    contractInstance.transactionHash,
                    (receiptErr, receipt) => {
                        if (receiptErr) {
                            throw receiptErr;
                        }

                        if (!receipt) {
                            throw new Error(
                                `Receipt not returned for transaction ${
                                    contractInstance.transactionHash
                                }`,
                            );
                        }

                        console.log(`Gas used: ${receipt.gasUsed}`);
                        console.log(`Transaction status: ${receipt.status}`);
                        console.log('Transaction logs:');
                        receipt.logs.forEach((log) => {
                            console.log(`\t${log}`);
                        });

                        process.exit(0);
                    },
                );
            },
        );
    });

    return rl.prompt();
});
