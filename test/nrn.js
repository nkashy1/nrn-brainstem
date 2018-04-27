var assert = require('assert');
var async = require('async');
var fs = require('fs');
var Ganache = require('ganache-core');
var _ = require('lodash');
var path = require('path');
var solc = require('solc');
var Web3 = require('web3');

const contractFile = path.resolve(__dirname, '../src/nrn.sol');
const contract = fs.readFileSync(contractFile).toString();
const compilationResult = solc.compile(contract);
const compiledContract = _.get(compilationResult, ['contracts', ':Neuron']);
const contractBytecode = _.get(compiledContract, 'bytecode');

/**
 * Sets up a web3 client and related objects for use in each test scenario.
 * Does this by populating the `configuration` object, defined in the scope
 * of each test case.
 * 
 * The fields it populates in the configuration object are:
 * 1. accounts - list of (unlocked) account objects available as part of the scenario
 * 2. account_addresses - list of addresses for each of the accounts (in the same order
 * as the list of accounts)
 * 3. Neuron - Neuron contract object
 * 4. provider - RPC provider (in this case, we are using a ganache-core Provider object)
 * 5. web3 - web3 client object
 * 
 * @param {Object} configuration - Object that should be populated with the test configuration
 * parameters
 */
function setUp(configuration) {
    provider = Ganache.provider();
    accounts = _.get(provider, ['manager', 'state', 'unlocked_accounts']);
    account_addresses = Object.keys(accounts);
    web3 = new Web3();
    web3.setProvider(provider);
    Neuron = web3.eth.contract(JSON.parse(_.get(compiledContract, 'interface')));

    configuration.accounts = accounts;
    configuration.account_addresses = account_addresses;
    configuration.Neuron = Neuron;
    configuration.provider = provider;
    configuration.web3 = web3;
}

/**
 * First estimates the amount of gas that a contract method call will require, then
 * applies the `assignGas` function to it to produce the amount of gas the sender
 * (`fromAccount`) will send with the method call, and finally executes the method call.
 * 
 * @param {Function} contractMethod - Smart contract method to be called asynchronously
 * @param {string} fromAccount - String representing address which should make the method call
 * @param {Function} assignGas - Logic determining how to produce actual gas sent with method
 * call based on gas estimate, e.g. (gasEstimate) => 2*gasEstimate
 * @param {...} rest - List of arguments to contract method, followed by callback
 */
function getGasEstimateAndCall(contractMethod, fromAccount, assignGas, ...rest) {
    let callback = rest[rest.length-1];
    let contractMethodArguments = rest.slice(0,rest.length-1);

    return contractMethod.estimateGas(
        ...contractMethodArguments,
        (err, gasEstimate) => {
            if (!!err) {
                return callback(err);
            }

            return contractMethod(
                ...contractMethodArguments,
                {
                    from: fromAccount,
                    gas: assignGas(gasEstimate)
                },
                callback
            );
        });
}

describe('NRN compilation', () => {
    it('should return no errors', (done) => {
        let errors = _.get(compilationResult, 'errors', []);
        assert.equal(errors.length, 0);
        done();
    });

    it('should return no warnings', (done) => {
        let warnings = _.get(compilationResult, 'warnings', []);
        assert.equal(warnings.length, 0);
        done();
    });

    it('should produce bytecode for the Neuron contract', (done) => {
        assert(!!contractBytecode);
        done();
    });
});

describe('NRN construction', () => {
    let configuration = {};

    before(() => {
        setUp(configuration);
    });

    after((done) => {
        provider.close(done);
    });

    it('should be called with a name, symbol, and an initial token supply', (done) => {
        configuration.web3.eth.estimateGas({data: contractBytecode}, (err, gasEstimate) => {
            if (!!err) {
                return done(err);
            }

            // Some of the web3 contract methods (like new) make multiple calls to
            // the provided callbacks. These callbacks represent different events.
            // The `callInfo` object tracks the number of calls made to each
            // callback.
            let callInfo = {
                new: 0
            };

            configuration.Neuron.new('Neuron', 'NRN', 100, {
                from: configuration.account_addresses[0],
                data: contractBytecode,
                gas: 2*gasEstimate
            }, (err, contract) => {
                if (!!err) {
                    return done(err);
                }

                callInfo.new += 1;

                if (callInfo.new === 2) {
                    done();
                }
            });
        });
    });

    it('should raise an error if it is called with insufficient gas', (done) => {
        configuration.web3.eth.estimateGas({data: contractBytecode}, (err, gasEstimate) => {
            if (!!err) {
                return done(err);
            }

            configuration.Neuron.new('Neuron', 'NRN', 100, {
                from: configuration.account_addresses[0],
                data: contractBytecode,
                gas: 1
            }, (err, contract) => {
                if (!!err) {
                    return done();
                }

                return done(new Error('No error raised'))
            });
        });
    });
});

describe('ERC20 methods', () => {
    let configuration = {};

    before((done) => {
        setUp(configuration);

        configuration.web3.eth.estimateGas({data: contractBytecode}, (err, gasEstimate) => {
            if (!!err) {
                return done(err);
            }

            // Some of the web3 contract methods (like new) make multiple calls to
            // the provided callbacks. These callbacks represent different events.
            // The `callInfo` object tracks the number of calls made to each
            // callback.
            let callInfo = {
                new: 0
            };

            configuration.Neuron.new('Neuron', 'NRN', 100, {
                from: configuration.account_addresses[0],
                data: contractBytecode,
                gas: 2*gasEstimate
            }, (err, contract) => {
                if (!!err) {
                    return done(err);
                }

                callInfo.new += 1;

                if (callInfo.new === 2) {
                    configuration.neuronInstance = contract;
                    done();
                }
            });
        });
    });

    after((done) => {
        provider.close(done);
    });

    it('testSupply should be callable by anyone and return the total amount of the token in circulation', (done) => {
        configuration.neuronInstance.totalSupply.estimateGas((err, gasEstimate) => {
            if (!!err) {
                return done(err);
            }

            configuration.neuronInstance.totalSupply({
                from: configuration.account_addresses[configuration.account_addresses.length-1],
                gas: 2*gasEstimate
            }, (err, supply) => {
                if (!!err) {
                    return done(err);
                }

                assert.strictEqual(supply.toNumber(), 100);
                return done();
            });
        });
    });

    it('the name and symbol of the token should be visible to anyone', (done) => {
        let methods = ['name', 'symbol'].map((k) => async.apply(
            getGasEstimateAndCall,
            configuration.neuronInstance[k]
        ));
        return async.applyEach(
            methods,
            configuration.account_addresses[configuration.account_addresses.length-1],
            (gasEstimate) => 2*gasEstimate,
            (err, results) => {
                if (!!err) {
                    return done(err);
                }

                assert.strictEqual(results[0], 'Neuron');
                assert.strictEqual(results[1], 'NRN');
                done();
            });
    });

    it('the balance of any address should be visible to any other address', (done) => {
        return getGasEstimateAndCall(
            configuration.neuronInstance.balanceOf,
            configuration.account_addresses[configuration.account_addresses.length-1],
            (gasEstimate) => 2*gasEstimate,
            configuration.account_addresses[0],
            (err, balance) => {
                if (!!err) {
                    return done(err);
                }

                assert.strictEqual(balance.toNumber(), 100);
                return done();
            });
    });
});