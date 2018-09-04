const fs = require('fs');
const path = require('path');
const solc = require('solc');

/**
 * Compiles the solidity file at the given path, automatically resolving any dependencies along the
 * way.
 *
 * This method is synchronous and may throw an error (for example, if it is not able to find a file
 * along the given contractPath).
 *
 * @param {string} contractPath The filesystem path to the contract file.
 * @return {Object} Compiled solidity contract as per https://github.com/ethereum/solc-js
 */
function compile(contractPath) {
    function readCallback(importPath) {
        let pathContent;
        try {
            pathContent = fs.readFileSync(importPath).toString();
        } catch (e) {
            return {
                error: `File not found: ${importPath}`,
            };
        }

        return {
            contents: pathContent,
        };
    }

    const contractCode = fs.readFileSync(contractPath).toString();
    const sourceObject = {};
    sourceObject[contractPath] = contractCode;

    return solc.compile({ sources: sourceObject }, 1, readCallback);
}

module.exports = compile;
