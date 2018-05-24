const assert = require('assert');
const async = require('async');
const getGasEstimateAndCall = require('../getGasEstimateAndCall.js');
const _ = require('lodash');

/**
 * checkBalances is an asynchronous function which accepts a configuration object (stem-brainstem
 * test fixture) and an array of integer target balances. It ensures that each of the accounts in
 * the configuration (in order) has the corresponding balance (from the balances array) in the
 * Stem contract instance specified by configuration.stemInstance.
 *
 * @param {Object} configuration - stem-brainstem test fixture (see any test for definition)
 * @param {int[]} targetBalances - array of balances of length no greater than the number of
 * accounts in configuration; if it is of smaller length k, then the tests are only applied to the
 * first k accounts
 * @callback done - should accept an error object and nothing else
 */
function checkBalances(configuration, targetBalances, done) {
    return async.map(
        configuration.account_addresses,
        async.apply(
            getGasEstimateAndCall,
            configuration.stemInstance.balanceOf,
            configuration.account_addresses[0],
            gasEstimate => 2 * gasEstimate,
        ),
        (balancesErr, balances) => {
            if (balancesErr) {
                return done(balancesErr);
            }

            assert(targetBalances.length <= balances.length);

            targetBalances.forEach((targetBalance, index) => {
                assert.strictEqual(balances[index].toNumber(), targetBalance);
            });

            return done();
        },
    );
}

module.exports = checkBalances;
