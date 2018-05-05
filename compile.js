const fs = require('fs');
const path = require('path');
const solc = require('solc');

function compile(contractPath) {
    const baseDir = path.resolve(path.dirname(contractPath));

    function readCallback(importPath) {
        let pathContent;
        const absoluteImportPath = path.join(baseDir, importPath);
        try {
            pathContent = fs.readFileSync(absoluteImportPath).toString();
        } catch (e) {
            return {
                error: `File not found: ${importPath} (resolved to ${absoluteImportPath})`,
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
