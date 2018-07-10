pragma solidity ^0.4.24;

import "./stem.sol";

/**
 * Stimulus is intended for deployment by data trial principal investigator (PI). There should be
 * one Stimulus contract per data trial.
 *
 * The contract offers the following semantics:
 * 1. A user, when they consent to enrolling in a data trial, calls the trial's Stimulus contract
 *    with a secret that was presented to them as part of the consent process. This secret could,
 *    for example, encode whether or not they match the trial criteria. It could also encode other
 *    information. The generation of the secret is up to the trial sponsor and the capabilities of
 *    the doc.ai application. This fires a Stimulation event.
 * 2. For each enrollment request, the data trial PI can review the request and either accept or
 *    reject the enrollment. A rejection of the enrollment puts the user on a blacklist whereby
 *    they can no longer make method calls against the given Stimulus smart contract. An acceptance
 *    of enrollment triggers a transfer of NRN tokens from the PI's NRN account to that of the user.
 *    This enrollment bonus is specified as a variable on the Stimulus contract for that trial.
 *    Whatever the PI's decision, a Response event is fired with a record of the decision and
 *    NRN payment.
 * 3. At any time, the PI can reject a user from the data trial, whereby they may no longer make
 *    method calls against the stimulus contract. Such a rejection fires a Response event.
 * 4. An accepted user may at any time submit data pertinent to the trial. The data is submitted
 *    off of this contract, but the user is expected to log their submission by calling the submit
 *    method of this contract. Submission fires a Stimulation event.
 * 5. The data trial PI can accept or reject any data submission. Rejection must come with a
 *    rejection code specifying the reason for rejection. Acceptance is predicated on the PI being
 *    able to transfer NRN from their account to that of the data trial participant. The amount of
 *    NRN transferred is determined by the data type (provided with the submission) and the rewards
 *    are specified in a rewards array publicly visible on the Stimulus contract.
 *
 * NOTE: The PI should approve the deployed Stimulus contract to pay out the appropriate amount
 * of NRN tokens.
 */
contract Stimulus {
    // State variables
    Stem public nrn;
    address public pi;
    uint[5] public rewards;

    // For the values:
    // 0 - participant has neither been accepted nor rejected into the data trial
    // 1 - participant has been accepted into the data trial
    // 2 - participant has been rejected from the data trial
    mapping(address => uint8) participants;

    // Events
    // Stimulus types:
    // 0: enrollment
    // > 0: data trial-specific collection types
    // Reward for collection type i is specified by rewards[i]
    event Stimulation(address indexed _candidate, uint8 indexed _stimulusType, uint _stimulusId);
    event Response(address indexed _candidate, uint8 indexed _stimulusType, uint stimulusId, bool accepted);

    constructor(address _nrn, uint[5] _rewards) public {
        nrn = Stem(_nrn);
        pi = msg.sender;

        uint8 i;
        for (i = 0; i < 5; i++) {
            rewards[i] = _rewards[i];
        }
    }
}