pragma solidity ^0.4.21;

/**
 * This contract is heavily inspired by the MiniMe contract:
 * https://github.com/Giveth/minime/blob/master/contracts/MiniMeToken.sol
 */

contract Neuron {
    // Neuron constructor
    constructor(string _name, string _symbol, uint256 initialSupply) public {
        name = _name;
        symbol = _symbol;
        neuronMaster = msg.sender;
        totalSupply = initialSupply;
        ledger[msg.sender] = initialSupply;
    }


    // Neuron token is issued by a Neuron Master, and this master has rights over
    // the token in excess of regular users.
    address public neuronMaster;
    
    function hasMastery(address entity) internal view returns (bool) {
        return entity == neuronMaster;
    }

    // Of course, the Neuron Master can change. But only if the original one
    // instigates the change.
    function changeMastery(address newNeuronMaster) public {
        require(hasMastery(msg.sender));
        neuronMaster = newNeuronMaster;
    }


    // Display information for Neuron token
    // ERC20 methods: name, symbol
    string public name;
    string public symbol;

    // The current neuron master (and only the current neuron master)
    // has the ability to change the display information.
    function changeName(string newName) public returns (bool) {
        require(hasMastery(msg.sender));
        name = newName;
        return true;
    }

    function changeSymbol(string newSymbol) public returns (bool) {
        require(hasMastery(msg.sender));
        symbol = newSymbol;
        return true;
    }


    // Ledger-related functionality
    // ERC20 methods: balanceOf
    mapping(address => uint256) ledger;
    
    function balanceOf(address entity) public view returns (uint256 balance) {
        return ledger[entity];
    }


    // Supply-related functionality
    // ERC20 methods: totalSupply
    uint public totalSupply;
    
    function increaseSupply(uint256 amount) public {
        require((msg.sender == address(this)) || hasMastery(msg.sender));
        uint256 newSupply = totalSupply + amount;
        require(newSupply > totalSupply);
        totalSupply = newSupply;
        ledger[msg.sender] += amount;
    }
    
    function decreaseSupply(uint256 amount) public {
        require((msg.sender == address(this)) || hasMastery(msg.sender));
        require(ledger[msg.sender] >= amount);
        uint256 newSupply = totalSupply - amount;
        require(newSupply >= 0);
        require(newSupply < totalSupply);
        ledger[msg.sender] -= amount;
        totalSupply = newSupply;
    }


    // Approval-related functionality
    // ERC20 methods: approve, allowance
    mapping(address => mapping(address => uint256)) allowances;
    
    function approve(address entity, uint256 allowance) public returns (bool success) {
        require(allowance >= 0);
        require((allowance == 0) || (allowances[msg.sender][entity] == 0));
        allowances[msg.sender][entity] = allowance;
        
        emit Approval(msg.sender, entity, allowance);
        
        return true;
    }
    
    function allowance(address owner, address proxy) public view returns (uint256) {
        return allowances[owner][proxy];
    }


    // Transfer-related functionality
    // ERC20 methods: transfer, transferFrom
    function _changeHands(address fromAddress, address toAddress, uint256 amount) internal returns (bool success) {
        require(amount <= ledger[fromAddress]);
        require((msg.sender == fromAddress) || (allowances[fromAddress][msg.sender] >= amount));
        ledger[toAddress] += amount;
        ledger[fromAddress] -= amount;
        if (msg.sender != fromAddress) {
            allowances[fromAddress][msg.sender] -= amount;
        }
        
        emit Transfer(fromAddress, toAddress, amount);
        
        return true;
    }
    
    function transfer(address _to, uint256 _value) public returns (bool success) {
        return _changeHands(msg.sender, _to, _value);
    }
    
    function transferFrom(address _from, address _to, uint256 _value) public returns (bool success) {
        return _changeHands(_from, _to, _value);
    }

    
    // ERC20 events: Transfer, Approval
    event Transfer(address indexed _from, address indexed _to, uint256 _value);
    event Approval(address indexed _owner, address indexed _spender, uint256 _value);
    
    
    // Whitelist functionality to define which contracts balance can be reclaimed from
    mapping(address => bool) public reclamationWhitelist;
    
    function whitelistContractForReclamation(Neuron oldNeuron) public returns (bool) {
        require(hasMastery(msg.sender));
        reclamationWhitelist[address(oldNeuron)] = true;
        return true;
    }
    
    // Allows transfer of token balance from old versions of the Neuron contract
    // to the current one. The current contract has to be approved to transfer
    // at least the specified amount on behalf of the given account on the old contract.
    function reclaimBalanceFrom(Neuron oldNeuron, address account, uint256 amount) public returns (bool) {
        require(reclamationWhitelist[address(oldNeuron)]);
        require(oldNeuron.transferFrom(account, this, amount));
        // Calling increaseSupply and transfer as external methods means that, in
        // those calls, msg.sender is the address of the contract instance in which
        // the reclaimBalanceFrom method was called.
        this.increaseSupply(amount);
        require(this.transfer(account, amount));
        return true;
    }
}