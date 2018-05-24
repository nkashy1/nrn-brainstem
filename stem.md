# stem

+ **Contract:** [src/stem.sol](src/stem.sol)

+ **Tests:** [test/stem.js](test/stem.js)

- - -

## Description

This contract defines the base Stem token that can be used to transact with parties in the doc.ai ecosystem. In
addition to the core [ERC-20 specification](https://github.com/ethereum/EIPs/blob/master/EIPS/eip-20.md), it implements
the following functionality:

1. Mastery - each deployment of the `stem` token has the concept of a stem master, an address which has privileged control of
the supply of the token as well as on its migration whitelist.

2. Migration - the stem token allows accounts to migrate their balances from older, whitelisted deployments of the token

For more details on how these features work, the best place to look is the [contract](src/stem.sol).

- - -

[HOME](README.md)