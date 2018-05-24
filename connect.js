/**
 * Generate an interface to a deployed smart contract from this repository.
 */

const _ = require('lodash');

const compile = require('./compile');

/**
 * Create a web3 contract instance representing a deployed smart contract.
 * This allows you to interact with the smart contract from within a Javascript environment.
 *
 * @param {string} contractAddress - Address of the smart contract you would like to connect to
 * @param {Object} web3Client - Web3 instance provisioned with a provider capable of making
 * transactions against the specified contract
 * @param {string} contractPath - Local path to contract solidity file
 * @param {string} contractName - Name of contract class in the solidity file at contractPath
 * @returns {Object} Web3 object representing the deployed contract
 */
function connect(contractAddress, web3Client, contractPath, contractName) {
    const compilationResult = compile(contractPath);
    const selector = `${contractPath}:${contractName}`;
    const compiledContract = _.get(compilationResult, ['contracts', selector]);
    if (!compiledContract) {
        throw new Error(`Contract not found: ${contractName} at ${contractPath}`);
    }

    const contractInterface = _.get(compiledContract, 'interface');
    if (!contractInterface) {
        throw new Error(`Compilation of contract ${contractName} at ${contractPath} did not produce interface`);
    }

    const abiArray = JSON.parse(contractInterface);
    const Contract = web3Client.eth.contract(abiArray);
    const contractInstance = Contract.at(contractAddress);
    return contractInstance;
}

module.exports = connect;
