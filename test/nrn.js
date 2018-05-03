const assert = require('assert');
const async = require('async');
const checkBalances = require('./checkBalances.js');
const fs = require('fs');
const Ganache = require('ganache-core');
const getGasEstimateAndCall = require('../getGasEstimateAndCall.js');
const _ = require('lodash');
const path = require('path');
const solc = require('solc');
const Web3 = require('web3');

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
 * NOTE:
 * ganache-core is used to simulate an Ethereum node. We use here the default settings, which
 * provide 10 unlocked accounts on the simulated node. Changes in this default behaviour could
 * result in our tests breaking.
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
 * @param {boolean} withNeuronInstance - If true, signifies that caller wants this function to
 * set up the text fixture with an instance of the Neuron contract (under the neuronInstance
 * key
 * @param {callback} done - This callback must only be provided if `withNeuronInstance` is true
 */
function setUp(configuration, withNeuronInstance, done) {
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
    configuration.Neuron = configuration.web3.eth.contract(
        JSON.parse(_.get(compiledContract, 'interface')),
    );

    if (withNeuronInstance) {
        if (!done) {
            throw new Error(
                'Configuration with Neuron instance must be asynchronous, but no callback was provided',
            );
        }

        configuration.web3.eth.estimateGas(
            { data: contractBytecode },
            (err, gasEstimate) => {
                if (err) {
                    return done(err);
                }

                // Some of the web3 contract methods (like new) make multiple calls to
                // the provided callbacks. These callbacks represent different events.
                // The `callInfo` object tracks the number of calls made to each
                // callback.
                const callInfo = {
                    new: 0,
                };

                return configuration.Neuron.new(
                    'Neuron',
                    'NRN',
                    100,
                    {
                        from: configuration.account_addresses[0],
                        data: contractBytecode,
                        gas: 2 * gasEstimate,
                    },
                    /* eslint-disable consistent-return */
                    (creationErr, contractInstance) => {
                        if (creationErr) {
                            return done(creationErr);
                        }

                        callInfo.new += 1;

                        if (callInfo.new === 2) {
                            configuration.neuronInstance = contractInstance;
                            return done();
                        }
                    },
                    /* eslint-enable consistent-return */
                );
            },
        );
    }
    /* eslint-enable no-param-reassign */
}

describe('NRN compilation:', () => {
    it('should return no errors', (done) => {
        const errors = _.get(compilationResult, 'errors', []);
        assert.equal(errors.length, 0);
        done();
    });

    it('should return no warnings', (done) => {
        const warnings = _.get(compilationResult, 'warnings', []);
        assert.equal(warnings.length, 0);
        done();
    });

    it('should produce bytecode for the Neuron contract', (done) => {
        assert(!!contractBytecode);
        done();
    });
});

describe('NRN construction:', () => {
    const configuration = {};

    before(() => {
        setUp(configuration);
    });

    after((done) => {
        configuration.provider.close(done);
    });

    it('should be called with a name, symbol, and an initial token supply', (done) => {
        configuration.web3.eth.estimateGas(
            { data: contractBytecode },
            (err, gasEstimate) => {
                if (err) {
                    return done(err);
                }

                // Some of the web3 contract methods (like new) make multiple calls to
                // the provided callbacks. These callbacks represent different events.
                // The `callInfo` object tracks the number of calls made to each
                // callback.
                const callInfo = {
                    new: 0,
                };

                return configuration.Neuron.new(
                    'Neuron',
                    'NRN',
                    100,
                    {
                        from: configuration.account_addresses[0],
                        data: contractBytecode,
                        gas: 2 * gasEstimate,
                    },
                    /* eslint-disable consistent-return */
                    (creationErr, contractInstance) => {
                        if (creationErr) {
                            return done(creationErr);
                        }

                        callInfo.new += 1;

                        if (callInfo.new === 2) {
                            return done();
                        }
                    },
                    /* eslint-enable consistent-return */
                );
            },
        );
    });

    it('should raise an error if it is called with insufficient gas', done =>
        configuration.web3.eth.estimateGas(
            { data: contractBytecode },
            (err, gasEstimate) => {
                if (err) {
                    return done(err);
                }

                return configuration.Neuron.new(
                    'Neuron',
                    'NRN',
                    100,
                    {
                        from: configuration.account_addresses[0],
                        data: contractBytecode,
                        gas: 1,
                    },
                    (creationErr, contractInstance) => {
                        if (creationErr) {
                            return done();
                        }

                        return done(new Error('No error raised'));
                    },
                );
            },
        ));
});

describe('ERC20 methods:', () => {
    const configuration = {};

    before(done => setUp(configuration, true, done));

    after((done) => {
        configuration.provider.close(done);
    });

    it('testSupply should be callable by anyone and return the total amount of the token in circulation', (done) => {
        configuration.neuronInstance.totalSupply.estimateGas((err, gasEstimate) => {
            if (err) {
                return done(err);
            }

            return configuration.neuronInstance.totalSupply(
                {
                    from:
            configuration.account_addresses[
                configuration.account_addresses.length - 1
            ],
                    gas: 2 * gasEstimate,
                },
                (supplyErr, supply) => {
                    if (supplyErr) {
                        return done(supplyErr);
                    }

                    assert.strictEqual(supply.toNumber(), 100);
                    return done();
                },
            );
        });
    });

    it('the name and symbol of the token should be visible to anyone', (done) => {
        const methods = ['name', 'symbol'].map(k =>
            async.apply(getGasEstimateAndCall, configuration.neuronInstance[k]));
        return async.applyEach(
            methods,
            configuration.account_addresses[
                configuration.account_addresses.length - 1
            ],
            gasEstimate => 2 * gasEstimate,
            (err, results) => {
                if (err) {
                    return done(err);
                }

                assert.strictEqual(results[0], 'Neuron');
                assert.strictEqual(results[1], 'NRN');
                return done();
            },
        );
    });

    it('the balance of any address should be visible to any other address', done =>
        getGasEstimateAndCall(
            configuration.neuronInstance.balanceOf,
            configuration.account_addresses[
                configuration.account_addresses.length - 1
            ],
            gasEstimate => 2 * gasEstimate,
            configuration.account_addresses[0],
            (err, balance) => {
                if (err) {
                    return done(err);
                }

                assert.strictEqual(balance.toNumber(), 100);
                return done();
            },
        ));

    describe('transfer:', () => {
        it('should allow any account to send its own funds to any other account', (done) => {
            getGasEstimateAndCall(
                configuration.neuronInstance.transfer,
                configuration.account_addresses[0],
                gasEstimate => 2 * gasEstimate,
                configuration.account_addresses[1],
                10,
                (err, success) => {
                    if (err) {
                        return done(err);
                    }

                    if (!success) {
                        return done(
                            new Error(
                                'Expected: transfer successful, actual: transfer unsuccessful',
                            ),
                        );
                    }

                    return getGasEstimateAndCall(
                        configuration.neuronInstance.balanceOf,
                        configuration.account_addresses[0],
                        gasEstimate => 2 * gasEstimate,
                        configuration.account_addresses[1],
                        (balanceErr, balance) => {
                            if (balanceErr) {
                                return done(balanceErr);
                            }

                            assert.strictEqual(balance.toNumber(), 10);
                            return done();
                        },
                    );
                },
            );
        });

        it('should raise an error if an account attempts to send more of its own fund than it controls to any other account', (done) => {
            getGasEstimateAndCall(
                configuration.neuronInstance.transfer,
                configuration.account_addresses[1],
                gasEstimate => 2 * gasEstimate,
                configuration.account_addresses[0],
                20,
                (transferErr, success) => {
                    if (transferErr) {
                        return checkBalances(
                            configuration,
                            [90, 10, 0, 0, 0, 0, 0, 0, 0, 0],
                            done,
                        );
                    }

                    return done(new Error('Expected: error, actual: success {$success}'));
                },
            );
        });

        it('should raise an error if an account attempts to send a negative amount', done =>
            getGasEstimateAndCall(
                configuration.neuronInstance.transfer,
                configuration.account_addresses[0],
                gasEstimate => 2 * gasEstimate,
                configuration.account_addresses[1],
                -5,
                (err, success) => {
                    if (err) {
                        return checkBalances(
                            configuration,
                            [90, 10, 0, 0, 0, 0, 0, 0, 0, 0],
                            done,
                        );
                    }

                    return done(new Error('Expected: error, actual: success {$success}'));
                },
            ));
    });

    describe('approve, allowance, transferFrom:', () => {
        it('allowance should allow any account to check how much money any other account has allowed a third account to transfer on its behalf', done =>
            getGasEstimateAndCall(
                configuration.neuronInstance.allowance,
                configuration.account_addresses[
                    configuration.account_addresses.length - 1
                ],
                gasEstimate => 2 * gasEstimate,
                configuration.account_addresses[0],
                configuration.account_addresses[1],
                (allowanceErr, allowance) => {
                    if (allowanceErr) {
                        return done(allowanceErr);
                    }

                    assert.strictEqual(allowance.toNumber(), 0);
                    return done();
                },
            ));

        it('approve should allow any account to approve another account to make transactions up to a given limit on its behalf, from its balance', done =>
            getGasEstimateAndCall(
                configuration.neuronInstance.approve,
                configuration.account_addresses[0],
                gasEstimate => 2 * gasEstimate,
                configuration.account_addresses[1],
                10,
                (approveErr, success) => {
                    if (approveErr) {
                        return done(approveErr);
                    }

                    if (!success) {
                        return done(
                            new Error(`Expected: success true, actual: success ${success}`),
                        );
                    }

                    return getGasEstimateAndCall(
                        configuration.neuronInstance.allowance,
                        configuration.account_addresses[0],
                        gasEstimate => 2 * gasEstimate,
                        configuration.account_addresses[0],
                        configuration.account_addresses[1],
                        (allowanceErr, allowance) => {
                            if (allowanceErr) {
                                return done(allowanceErr);
                            }

                            assert.strictEqual(allowance.toNumber(), 10);
                            return done();
                        },
                    );
                },
            ));

        it('transferFrom should allow any account with sufficient approval to transfer funds from one account to another account', done =>
            getGasEstimateAndCall(
                configuration.neuronInstance.transferFrom,
                configuration.account_addresses[1],
                gasEstimate => 2 * gasEstimate,
                configuration.account_addresses[0],
                configuration.account_addresses[2],
                7,
                (transferErr, transferResult) => {
                    if (transferErr) {
                        return done(transferErr);
                    }

                    return getGasEstimateAndCall(
                        configuration.neuronInstance.allowance,
                        configuration.account_addresses[1],
                        gasEstimate => 2 * gasEstimate,
                        configuration.account_addresses[0],
                        configuration.account_addresses[1],
                        (allowanceErr, allowance) => {
                            if (allowanceErr) {
                                return done(allowanceErr);
                            }

                            assert.strictEqual(allowance.toNumber(), 3);

                            return checkBalances(
                                configuration,
                                [83, 10, 7, 0, 0, 0, 0, 0, 0, 0],
                                done,
                            );
                        },
                    );
                },
            ));
    });
});

describe('Mastery:', () => {
    const configuration = {};

    before(done => setUp(configuration, true, done));

    after((done) => {
        configuration.provider.close(done);
    });

    it('any address should be able to view the current Neuron master', done =>
        getGasEstimateAndCall(
            configuration.neuronInstance.neuronMaster,
            configuration.account_addresses[1],
            gasEstimate => 2 * gasEstimate,
            (err, master) => {
                if (err) {
                    return done(err);
                }

                assert.strictEqual(master, configuration.account_addresses[0]);
                return done();
            },
        ));

    it('the current Neuron master should be able to hand off mastery to a new Neuron master', done =>
        getGasEstimateAndCall(
            configuration.neuronInstance.changeMastery,
            configuration.account_addresses[0],
            gasEstimate => 2 * gasEstimate,
            configuration.account_addresses[1],
            (changeErr) => {
                if (changeErr) {
                    return done(changeErr);
                }

                return getGasEstimateAndCall(
                    configuration.neuronInstance.neuronMaster,
                    configuration.account_addresses[0],
                    gasEstimate => 2 * gasEstimate,
                    (masterErr, master) => {
                        if (masterErr) {
                            return done(masterErr);
                        }

                        assert.strictEqual(master, configuration.account_addresses[1]);
                        return done();
                    },
                );
            },
        ));

    it('only the Neuron master should be able to change the mastery of a contract', done =>
        getGasEstimateAndCall(
            configuration.neuronInstance.changeMastery,
            configuration.account_addresses[0],
            gasEstimate => 2 * gasEstimate,
            configuration.account_addresses[0],
            (changeErr) => {
                if (changeErr) {
                    return getGasEstimateAndCall(
                        configuration.neuronInstance.neuronMaster,
                        configuration.account_addresses[2],
                        gasEstimate => 2 * gasEstimate,
                        (masterErr, master) => {
                            if (masterErr) {
                                return done(masterErr);
                            }

                            assert.strictEqual(master, configuration.account_addresses[1]);
                            return done();
                        },
                    );
                }

                return done(
                    new Error('Expected: error, actual: mastery successfully changed'),
                );
            },
        ));
});

describe('increaseSupply and decreaseSupply', () => {
    const configuration = {};

    /**
     * For the setup of this test case, the contract owner (configuration.account_addresses[0])
     * transfers half of its wealth to configuration.account_addresses[1] at the outset.
     */
    before(done => setUp(configuration, true, (err) => {
        if (err) {
            return done(err);
        }

        return getGasEstimateAndCall(
            configuration.neuronInstance.transfer,
            configuration.account_addresses[0],
            gasEstimate => 2 * gasEstimate,
            configuration.account_addresses[1],
            50,
            done,
        );
    }));

    after((done) => {
        configuration.provider.close(done);
    });

    it('the neuron master should be able to increase supply, with the new tokens being credited to their account', done =>
        getGasEstimateAndCall(
            configuration.neuronInstance.increaseSupply,
            configuration.account_addresses[0],
            gasEstimate => 2 * gasEstimate,
            17,
            (increaseErr) => {
                if (increaseErr) {
                    return done(increaseErr);
                }

                return async.parallel([
                    callback => getGasEstimateAndCall(
                        configuration.neuronInstance.balanceOf,
                        configuration.account_addresses[0],
                        gasEstimate => 2 * gasEstimate,
                        configuration.account_addresses[0],
                        callback,
                    ),
                    callback => getGasEstimateAndCall(
                        configuration.neuronInstance.totalSupply,
                        configuration.account_addresses[0],
                        gasEstimate => 2 * gasEstimate,
                        callback,
                    ),
                ], (verificationErr, results) => {
                    if (verificationErr) {
                        return done(verificationErr);
                    }

                    const [balance, totalSupply] = results;

                    assert.strictEqual(balance.toNumber(), 67);
                    assert.strictEqual(totalSupply.toNumber(), 117);
                    return done();
                });
            },
        ));

    it('the neuron master should be able to decrease the supply, with the difference in supply being erased from their account', done =>
        getGasEstimateAndCall(
            configuration.neuronInstance.decreaseSupply,
            configuration.account_addresses[0],
            gasEstimate => 2 * gasEstimate,
            17,
            (decreaseErr) => {
                if (decreaseErr) {
                    return done(decreaseErr);
                }
                return async.parallel([
                    callback => getGasEstimateAndCall(
                        configuration.neuronInstance.balanceOf,
                        configuration.account_addresses[0],
                        gasEstimate => 2 * gasEstimate,
                        configuration.account_addresses[0],
                        callback,
                    ),
                    callback => getGasEstimateAndCall(
                        configuration.neuronInstance.totalSupply,
                        configuration.account_addresses[0],
                        gasEstimate => 2 * gasEstimate,
                        callback,
                    ),
                ], (verificationErr, results) => {
                    if (verificationErr) {
                        return done(verificationErr);
                    }

                    const [balance, totalSupply] = results;

                    assert.strictEqual(balance.toNumber(), 50);
                    assert.strictEqual(totalSupply.toNumber(), 100);
                    return done();
                });
            },
        ));

    it('the neuron master should not be able to decrease supply in excess of their wealth', done =>
        getGasEstimateAndCall(
            configuration.neuronInstance.decreaseSupply,
            configuration.account_addresses[0],
            gasEstimate => 2 * gasEstimate,
            101,
            (decreaseErr) => {
                if (decreaseErr) {
                    return async.parallel([
                        callback => getGasEstimateAndCall(
                            configuration.neuronInstance.balanceOf,
                            configuration.account_addresses[0],
                            gasEstimate => 2 * gasEstimate,
                            configuration.account_addresses[0],
                            callback,
                        ),
                        callback => getGasEstimateAndCall(
                            configuration.neuronInstance.totalSupply,
                            configuration.account_addresses[0],
                            gasEstimate => 2 * gasEstimate,
                            callback,
                        ),
                    ], (verificationErr, results) => {
                        if (verificationErr) {
                            return done(verificationErr);
                        }

                        const [balance, totalSupply] = results;

                        assert.strictEqual(balance.toNumber(), 50);
                        assert.strictEqual(totalSupply.toNumber(), 100);
                        return done();
                    });
                }

                return done(
                    new Error('Expected: error, actual: decreaseSupply concluded with no error'),
                );
            },
        ));

    it('no one but the neuron master should be able to increase supply', done =>
        getGasEstimateAndCall(
            configuration.neuronInstance.increaseSupply,
            configuration.account_addresses[1],
            gasEstimate => 2 * gasEstimate,
            1,
            (increaseErr) => {
                if (increaseErr) {
                    return async.parallel([
                        callback => getGasEstimateAndCall(
                            configuration.neuronInstance.balanceOf,
                            configuration.account_addresses[1],
                            gasEstimate => 2 * gasEstimate,
                            configuration.account_addresses[1],
                            callback,
                        ),
                        callback => getGasEstimateAndCall(
                            configuration.neuronInstance.totalSupply,
                            configuration.account_addresses[1],
                            gasEstimate => 2 * gasEstimate,
                            callback,
                        ),
                    ], (verificationErr, results) => {
                        if (verificationErr) {
                            return done(verificationErr);
                        }

                        const [balance, totalSupply] = results;

                        assert.strictEqual(balance.toNumber(), 50);
                        assert.strictEqual(totalSupply.toNumber(), 100);
                        return done();
                    });
                }

                return done(
                    new Error('Expected: error, actual: increaseSupply concluded with no error'),
                );
            },
        ));

    it('no one but the neuron master should be able to decrease supply', done =>
        getGasEstimateAndCall(
            configuration.neuronInstance.decreaseSupply,
            configuration.account_addresses[1],
            gasEstimate => 2 * gasEstimate,
            1,
            (increaseErr) => {
                if (increaseErr) {
                    return async.parallel([
                        callback => getGasEstimateAndCall(
                            configuration.neuronInstance.balanceOf,
                            configuration.account_addresses[1],
                            gasEstimate => 2 * gasEstimate,
                            configuration.account_addresses[1],
                            callback,
                        ),
                        callback => getGasEstimateAndCall(
                            configuration.neuronInstance.totalSupply,
                            configuration.account_addresses[1],
                            gasEstimate => 2 * gasEstimate,
                            callback,
                        ),
                    ], (verificationErr, results) => {
                        if (verificationErr) {
                            return done(verificationErr);
                        }

                        const [balance, totalSupply] = results;

                        assert.strictEqual(balance.toNumber(), 50);
                        assert.strictEqual(totalSupply.toNumber(), 100);
                        return done();
                    });
                }

                return done(
                    new Error('Expected: error, actual: decreaseSupply concluded with no error'),
                );
            },
        ));
});
