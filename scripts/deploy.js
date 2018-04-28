const fs = require('fs');
const Ganache = require('ganache-core');
const _ = require('lodash');
const solc = require('solc');
const Web3 = require('web3');
const yargs = require('yargs');

yargs
    .usage(
        '$0 --provider {ipc|http|ws|test} <path-to-provider>',
    )
    .option(
        'provider',
        {
            alias: 'p',
            describe: 'Resource descriptor for provider: path to IPC socket, or HTTP or websocket URI',
        },
    )
    .option(
        'provider-type',
        {
            alias: 't',
            describe: 'Type of provider that should be used to connect to ethereum-based node',
            choices: ['ipc', 'http', 'ws', 'test'],
        },
    )
    .option(
        'contract-file',
        {
            alias: 'c',
            describe: 'Path to file containing the solidity smart contract',
        },
    )
    .option(
        'contract-name',
        {
            alias: 'n',
            describe: 'Name of contract from contract file that you would like to deploy',
        },
    );

const {
    contractFile,
    contractName,
    provider,
    providerType,
} = yargs.argv;

if (providerType !== 'test' && !provider) {
    throw new Error(`Passing provider type ${providerType} requires you to also pass a provider`);
}

// Contract compilation
console.log(`Compiling contract in ${contractFile}...`);
const contract = fs.readFileSync(contractFile).toString();
const compilationResult = solc.compile(contract);
const compiledContract = _.get(compilationResult, ['contracts', contractName]);
const contractBytecode = _.get(compiledContract, 'bytecode');
console.log('Contract compilation complete!')

// Set up web3 client
console.log(`Creating web3 client with provider type: ${providerType}, provider: ${provider}...`)
const web3Providers = {
    ipc: Web3.providers.IpcProvider,
    http: Web3.providers.HttpProvider,
    ws: Web3.providers.WebsocketProvider,
};

function makeClient(clientProvider, clientProviderType) {
    if (!clientProviderType) {
        return new Web3(clientProvider);
    } else if (clientProviderType === 'test') {
        return new Web3(Ganache.provider());
    }

    return new Web3(new web3Providers[clientProviderType](clientProvider));
}

const web3 = makeClient(provider, providerType);
console.log('Web3 client ready!');

// Deploy contract
console.log('Deploying contract...');

// TODO(neeraj): Complete this!
