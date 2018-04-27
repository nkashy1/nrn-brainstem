var assert = require('assert');
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
                from: configuration.account_addresses[1],
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
});