pragma solidity ^0.4.24;

import "./stem.sol";

/**
 * Stimulus is intended for deployment by a data trial principal investigator (PI). There should be
 * one Stimulus contract per data trial.
 *
 * The contract offers the following semantics:
 * 1. A user, when they consent to enrolling in a data trial, calls the trial's Stimulus contract
 *    with a secret that was presented to them as part of the consent process. This secret could,
 *    for example, encode whether or not they match the trial criteria. It could also encode other
 *    information. The generation of the secret is up to the trial sponsor and the capabilities of
 *    the doc.ai application. This fires a StimulusRequest event.
 * 2. For each enrollment request, the data trial PI can review the request and either accept or
 *    reject the enrollment. A rejection of the enrollment puts the user on a blacklist whereby
 *    they can no longer make method calls against the given Stimulus smart contract. An acceptance
 *    of enrollment triggers a transfer of NRN tokens from the PI's NRN account to that of the user.
 *    This enrollment bonus is specified as a variable on the Stimulus contract for that trial.
 *    Whatever the PI's decision, a StimulusResponse event is fired with a record of the decision and
 *    NRN payment.
 * 3. At any time, the PI can reject a user from the data trial, whereby they may no longer make
 *    method calls against the stimulus contract. Such a rejection fires a StimulusResponse event.
 * 4. An accepted user may at any time submit data pertinent to the trial. The data is submitted
 *    off of this contract, but the user is expected to log their submission by calling the submit
 *    method of this contract. Submission fires a StimulusRequest event.
*
 * NOTE: The PI should approve the deployed Stimulus contract to pay out the appropriate amount
 * of NRN tokens.
 */
contract Stimulus {
    // State variables
    Stem public nrn;
    address public principalInvestigator;
    uint256[5] public rewards;

    // For the values:
    // 0 - participant has neither been accepted nor rejected into the data trial
    // 1 - participant has attempted to enroll in the data trial
    // 2 - participant has been rejected from the data trial
    // 3 - participant has been accepted into the data trial
    mapping(address => uint8) participants;

    // Events
    // Stimulus types:
    // 0: enrollment
    // > 0: data trial-specific collection types
    // Reward for collection type i is specified by rewards[i]
    event StimulusRequest(address indexed _candidate, uint8 indexed _stimulusType, uint256 _stimulusId);
    event StimulusResponse(address indexed _candidate, uint8 indexed _stimulusType, uint256 _stimulusId, bool _accepted);

    constructor(address _nrn, uint256[5] _rewards) public {
        nrn = Stem(_nrn);
        principalInvestigator = msg.sender;

        uint8 i;
        for (i = 0; i < 5; i++) {
            rewards[i] = _rewards[i];
        }
    }

    function status(address participant) public view returns (uint8) {
        return participants[participant];
    }

    function enroll(uint256 stimulusId) public returns (bool success) {
        require(participants[msg.sender] != 2);
        participants[msg.sender] = 1;
        emit StimulusRequest(msg.sender, 0, stimulusId);
        return true;
    }

    function submit(uint8 stimulusType, uint256 stimulusId) public returns (bool success) {
        require(participants[msg.sender] == 3);
        require(stimulusType > 0);
        require(stimulusType < 5);
        emit StimulusRequest(msg.sender, stimulusType, stimulusId);
        return true;
    }

    function respondToEnrollment(address candidate, uint256 stimulusId, bool accept) public returns (bool success) {
        require(msg.sender == principalInvestigator);
        if (accept) {
            require(nrn.transferFrom(principalInvestigator, candidate, rewards[0]));
            participants[candidate] = 3;
        } else {
            participants[candidate] = 2;
        }
        emit StimulusResponse(candidate, 0, stimulusId, accept);
        return true;
    }

    function respond(address candidate, uint8 stimulusType, uint256 stimulusId, bool accept) public returns (bool success) {
        require(msg.sender == principalInvestigator);
        require(stimulusType > 0);
        require(stimulusType < 5);
        if (accept) {
            require(nrn.transferFrom(principalInvestigator, candidate, rewards[stimulusType]));
        }
        emit StimulusResponse(candidate, stimulusType, stimulusId, accept);
        return true;
    }
}
