/**
 * This file contains tests for the Stimulus smart contract found in ../src/stimulus.sol
 *
 * You can search for tests for a particular Stimulus contract method by searching for its name in
 * this file.
 */

const assert = require('assert');
const async = require('async');
const checkBalances = require('./checkBalances.js');
const compile = require('../compile.js');
const Ganache = require('ganache-core');
const getGasEstimateAndCall = require('../getGasEstimateAndCall.js');
const _ = require('lodash');
const path = require('path');
const Web3 = require('web3');


/**
 * Generates contract class and bytecode for use in tests
 *
 * @param {string} contractPath - Path to solidity file implementing the contract in question
 * @param {string} contractName - Name of contract to prepare
 * @returns {Object} - compiled contract object
 */
function contractArtifacts(contractPath, contractName) {
    const contractFile = path.resolve(__dirname, contractPath);
    const compilationResult = compile(contractFile);
    const compiledContract = _.get(compilationResult, ['contracts', `${contractFile}:${contractName}`]);
    return compiledContract;
}


const stem = contractArtifacts('../src/stem.sol', 'Stem');
const stimulus = contractArtifacts('../src/stimulus.sol', 'Stimulus');


/**
 * Sets up a web3 client and related objects for use in each test scenario.
 * Does this by populating the `configuration` object, defined in the scope
 * of each test case.
 *
 * NOTE:
 * ganache-core is used to simulate an Ethereum node. We use here the default settings, which
 * provide 10 unlocked accounts on the simulated node. Changes in this default behaviour could
 * result in our tests breaking.
 *
 * The fields it populates in the configuration object are:
 * 1. accounts - list of (unlocked) account objects available as part of the scenario
 * 2. account_addresses - list of addresses for each of the accounts (in the same order
 * as the list of accounts)
 * 3. Stem - Stem contract object
 * 4. Stimulus - Stimulus contract object
 * 5. provider - RPC provider (in this case, we are using a ganache-core Provider object)
 * 6. web3 - web3 client object
 *
 * @param {Object} configuration - Object that should be populated with the test configuration
 * parameters
 * @param {callback} done - Callback to be fired with no arguments once setup is complete
 */
function setUp(configuration, done) {
    /* eslint-disable no-param-reassign */
    configuration.provider = Ganache.provider();
    configuration.accounts = _.get(configuration.provider, [
        'manager',
        'state',
        'unlocked_accounts',
    ]);
    configuration.account_addresses = Object.keys(configuration.accounts);
    configuration.web3 = new Web3();
    configuration.web3.setProvider(configuration.provider);
    configuration.Stem = configuration.web3.eth.contract(
        JSON.parse(_.get(stem, 'interface')),
    );
    configuration.Stimulus = configuration.web3.eth.contract(
        JSON.parse(_.get(stimulus, 'interface')),
    );

    const stemBytecode = _.get(stem, 'bytecode');
    const stimulusBytecode = _.get(stimulus, 'bytecode');

    async.waterfall([
        // Get gas estimate for Stem contract deployment
        next => configuration.web3.eth.estimateGas({ data: stemBytecode }, next),
        // Deply Stem contract
        (gasEstimate, next) => {
            // Some of the web3 contract methods (like new) make multiple calls to
            // the provided callbacks. These callbacks represent different events.
            // The `callInfo` object tracks the number of calls made to each
            // callback.
            const callInfo = {
                new: 0,
            };

            return configuration.Stem.new(
                'Stem',
                'STM',
                12000000000000,
                {
                    from: configuration.account_addresses[0],
                    data: stemBytecode,
                    gas: 2 * gasEstimate,
                },
                /* eslint-disable consistent-return */
                (creationErr, contractInstance) => {
                    if (creationErr) {
                        return next(creationErr);
                    }

                    callInfo.new += 1;

                    if (callInfo.new === 2) {
                        configuration.stemInstance = contractInstance;
                        return next(null, contractInstance);
                    }
                },
                /* eslint-enable consistent-return */
            );
        },
        // Get gas estimate for Stimulus contract deployment
        (stemInstance, next) => {
            configuration.web3.eth.estimateGas({ data: stimulusBytecode }, (err, gasEstimate) => {
                if (err) {
                    return next(err);
                }

                return next(null, stemInstance, gasEstimate);
            });
        },
        // Deploy Stimulus contract -- mimics Stem deployment
        (stemInstance, gasEstimate, next) => {
            const callInfo = {
                new: 0,
            };

            return configuration.Stimulus.new(
                stemInstance.address,
                [10000000, 5000000, 1000000, 0, 0],
                {
                    from: configuration.account_addresses[0],
                    data: stimulusBytecode,
                    gas: 2 * gasEstimate,
                },
                /* eslint-disable consistent-return */
                (creationErr, contractInstance) => {
                    if (creationErr) {
                        return next(creationErr);
                    }

                    callInfo.new += 1;

                    if (callInfo.new === 2) {
                        configuration.stimulusInstance = contractInstance;
                        return next(null, stemInstance, contractInstance);
                    }
                },
                /* eslint-enable consistent-return */
            );
        },
        // Approve deployed Stimulus contract to spend maximum allowable amount on behalf of deployer
        (stemInstance, stimulusInstance, next) => getGasEstimateAndCall(
            stemInstance.approve,
            configuration.account_addresses[0],
            gasEstimate => 2 * gasEstimate,
            stimulusInstance.address,
            1000000000000,
            next,
        ),
    ], done);
    /* eslint-enable no-param-reassign */
}

describe('Stimulus setup', () => {
    const configuration = {};

    before(done => setUp(configuration, done));

    after(done => configuration.provider.close(done));

    it('should proceed without failure when provided with a valid Stem contract address', () => {});

    it(
        'should include the Stimulus contract being approved to spend Stem tokens on behalf of its deployer',
        done => getGasEstimateAndCall(
            configuration.stemInstance.allowance,
            configuration.account_addresses[1],
            gasEstimate => 2 * gasEstimate,
            configuration.account_addresses[0],
            configuration.stimulusInstance.address,
            (err, allowance) => {
                if (err) {
                    return done(err);
                }
                if (allowance === 0) {
                    return done(new Error('Expected: non-zero allowance, actual: zero allowance'));
                }
                return done();
            },
        ),
    );
});
