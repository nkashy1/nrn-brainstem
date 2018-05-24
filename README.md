# nrn-brainstem

Stem and related smart contracts

- - -

This repository is home to all of doc.ai's smart contracts. It makes available the smart contracts themselves (in solidity),
the tests that we run against each contract, and evaluations of these contracts in terms of properties such as gas overhead
and security.

The respository also includes tools that can be used to deploy these contracts to Ethereum-based blockchains.

- - -

## Smart contracts

+ [stem](stem.md)

- - -

## Deployment

To deploy a smart contract in this repository, you can use the [deploy script](./deploy.js). For
example, to deploy the Stem contract through a geth node, assuming you start off in the respository
root directory, you could run:

```
node deploy.js --provider-type ipc \
  --provider <path to geth ipc socket> \
  --contract-file src/stem.sol \
  --contract-name Stem \
  --sender-address <address of wallet which should send the transaction> \
  Stem STM 1200000
```

The last three positional arguments are passed directly to the contract constructor. In this case,
they specify that the Stem contract should be deployed with name `Stem`, symbol `STM`, and with
a supply of 1,200,000 tokens.

You can get more help on the deploy script at the command line:
```
node deploy.js --help
```

You can use the [connect script](./connect.js) to connect to a deployed contract. This is useful
if you would like to interact with a contract that you deployed through a node REPL, for example.


## Development

### Requirements

+ [`node v9.11.1`](https://nodejs.org/en/blog/release/v9.11.1/) or later


### Getting set up

Simply run:
```
npm install
```


### Running tests

From project root:

```
npm test
```

To run specific tests:

```
npm test <path to test>
```