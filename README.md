# nrn-brainstem

NRN and related smart contracts

- - -

This repository is home to all of doc.ai's smart contracts. It makes available the smart contracts themselves (in solidity),
the tests that we run against each contract, and evaluations of these contracts in terms of properties such as gas overhead
and security.

The respository also includes tools that can be used to deploy these contracts to Ethereum-based blockchains.

- - -

## Smart contracts

+ [NRN](NRN.md)

- - -

## Development

### Requirements

+ [`node v9.11.1`](https://nodejs.org/en/blog/release/v9.11.1/) or later

+ [`yarn`](https://yarnpkg.com/en/) (although `npm` will probably suffice)


### Getting set up

Simply run:
```
yarn install
```


### Running tests

From project root:

```
yarn test
```

To run specific tests:

```
yarn test <path to test>
```