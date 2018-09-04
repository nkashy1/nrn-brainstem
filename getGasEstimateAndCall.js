/**
 * First estimates the amount of gas that a contract method call will require, then
 * applies the `assignGas` function to it to produce the amount of gas the sender
 * (`fromAccount`) will send with the method call, and finally executes the method call.
 *
 * @param {Function} contractMethod - Smart contract method to be called asynchronously
 * @param {string} fromAccount - String representing address which should make the method call
 * @param {Function} assignGas - Logic determining how to produce actual gas sent with method
 * call based on gas estimate, e.g. (gasEstimate) => 2*gasEstimate
 * @param {...Object} rest - List of arguments to contract method, followed by callback
 */
function getGasEstimateAndCall(
    contractMethod,
    fromAccount,
    assignGas,
    ...rest
) {
    const callback = rest[rest.length - 1];
    const contractMethodArguments = rest.slice(0, rest.length - 1);

    return contractMethod.estimateGas(
        ...contractMethodArguments,
        (err, gasEstimate) => {
            if (err) {
                return callback(err);
            }

            return contractMethod(
                ...contractMethodArguments,
                {
                    from: fromAccount,
                    gas: assignGas(gasEstimate),
                },
                callback,
            );
        },
    );
}

module.exports = getGasEstimateAndCall;
