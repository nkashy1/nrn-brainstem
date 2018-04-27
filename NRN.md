# NRN

+ **Contract:** [src/nrn.sol](src/nrn.sol)

+ **Tests:** [test/nrn.js](test/nrn.js)

- - -

## Description

This contract defines the base Neuron token that can be used to transact with parties in the doc.ai ecosystem. In
addition to the core [ERC-20 specification](https://github.com/ethereum/EIPs/blob/master/EIPS/eip-20.md), it implements
the following functionality:

1. Mastery - each deployment of the `NRN` token has the concept of a neuron master, an address which has privileged control of
the supply of the token as well as on its migration whitelist.

2. Migration - the NRN token allows accounts to migrate their balances from older, whitelisted deployments of the token

For more details on how these features work, the best place to look is the [contract](src/nrn.sol).

- - -

[HOME](README.md)