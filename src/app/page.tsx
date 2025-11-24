"use client";
// pages/index.tsx
import { useState, useEffect } from 'react';
import { ethers } from 'ethers';

declare global {
  interface Window {
    ethereum?: any;
  }
}

// ABI matching your smart contract
const ARISAN_ABI = [
  "function groupCounter() public view returns (uint256)",
  "function groups(uint256) public view returns (string name, uint256 contributionAmount, uint256 balance, uint256 round)",
  "function createGroup(string _name, uint256 _contributionAmount) external returns (uint256)",
  "function joinGroup(uint256 _groupId) external",
  "function deposit(uint256 _groupId) external payable",
  "function spin(uint256 _groupId) external",
  "function getWinner(uint256 _groupId, uint256 _round) external view returns (address)",
  "function memberCount(uint256 _groupId) external view returns (uint256)",
  "event GroupCreated(uint256 indexed groupId, string name, uint256 contributionAmount)",
  "event JoinedGroup(uint256 indexed groupId, address indexed member)",
  "event Deposited(uint256 indexed groupId, address indexed member, uint256 amount)",
  "event RoundWinner(uint256 indexed groupId, uint256 round, address winner)"
];

const ARISAN_ADDRESS = "0x5FbDB2315678afecb367f032d93F642f64180aa3";

export default function ArisanDapp() {
  const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null);
  const [signer, setSigner] = useState<ethers.Signer | null>(null);
  const [contract, setContract] = useState<ethers.Contract | null>(null);
  const [account, setAccount] = useState<string>("");
  const [isConnected, setIsConnected] = useState(false);
  const [loading, setLoading] = useState(false);

  // Group states
  const [groups, setGroups] = useState<any[]>([]);
  const [groupCounter, setGroupCounter] = useState(0);

  // Form states
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupAmount, setNewGroupAmount] = useState("");
  const [joinGroupId, setJoinGroupId] = useState("");
  const [depositGroupId, setDepositGroupId] = useState("");
  const [spinGroupId, setSpinGroupId] = useState("");

  // Connect to MetaMask
  const connectWallet = async () => {
    if (typeof window.ethereum !== 'undefined') {
      try {
        await window.ethereum.request({ method: 'eth_requestAccounts' });
        const web3Provider = new ethers.BrowserProvider(window.ethereum);
        const web3Signer = await web3Provider.getSigner();
        const userAddress = await web3Signer.getAddress();
        
        const arisanContract = new ethers.Contract(ARISAN_ADDRESS, ARISAN_ABI, web3Signer);
        
        setProvider(web3Provider);
        setSigner(web3Signer);
        setContract(arisanContract);
        setAccount(userAddress);
        setIsConnected(true);
        
        await loadGroups();
      } catch (error) {
        console.error('Error connecting wallet:', error);
      }
    } else {
      alert('Please install MetaMask!');
    }
  };

  // Load groups from contract
  const loadGroups = async () => {
    if (!contract) return;
    
    try {
      setLoading(true);
      const counter = await contract.groupCounter();
      setGroupCounter(Number(counter));
      
      const groupsData = [];
      for (let i = 1; i <= Number(counter); i++) {
        const group = await contract.groups(i);
        const memberCount = await contract.memberCount(i);
        
        groupsData.push({
          id: i,
          name: group.name,
          contributionAmount: ethers.formatEther(group.contributionAmount),
          balance: ethers.formatEther(group.balance),
          round: Number(group.round),
          memberCount: Number(memberCount)
        });
      }
      
      setGroups(groupsData);
    } catch (error) {
      console.error('Error loading groups:', error);
    } finally {
      setLoading(false);
    }
  };

  // Create new group
  const createGroup = async () => {
    if (!contract || !newGroupName || !newGroupAmount) return;
    
    try {
      setLoading(true);
      const amountInWei = ethers.parseEther(newGroupAmount);
      const tx = await contract.createGroup(newGroupName, amountInWei);
      await tx.wait();
      
      setNewGroupName("");
      setNewGroupAmount("");
      await loadGroups();
      
      alert('Group created successfully!');
    } catch (error) {
      console.error('Error creating group:', error);
      alert('Error creating group');
    } finally {
      setLoading(false);
    }
  };

  // Join group
  const joinGroup = async () => {
    if (!contract || !joinGroupId) return;
    
    try {
      setLoading(true);
      const tx = await contract.joinGroup(joinGroupId);
      await tx.wait();
      
      setJoinGroupId("");
      await loadGroups();
      
      alert('Joined group successfully!');
    } catch (error) {
      console.error('Error joining group:', error);
      alert('Error joining group');
    } finally {
      setLoading(false);
    }
  };

  // Deposit to group
  const depositToGroup = async () => {
    if (!contract || !depositGroupId) return;
    
    try {
      setLoading(true);
      const group = groups.find(g => g.id === parseInt(depositGroupId));
      if (!group) throw new Error('Group not found');
      
      const amountInWei = ethers.parseEther(group.contributionAmount);
      const tx = await contract.deposit(depositGroupId, { value: amountInWei });
      await tx.wait();
      
      setDepositGroupId("");
      await loadGroups();
      
      alert('Deposit successful!');
    } catch (error) {
      console.error('Error depositing:', error);
      alert('Error depositing');
    } finally {
      setLoading(false);
    }
  };

  // Spin to pick winner
  const spinGroup = async () => {
    if (!contract || !spinGroupId) return;
    
    try {
      setLoading(true);
      const tx = await contract.spin(spinGroupId);
      await tx.wait();
      
      setSpinGroupId("");
      await loadGroups();
      
      alert('Winner selected successfully!');
    } catch (error) {
      console.error('Error spinning:', error);
      alert('Error spinning group');
    } finally {
      setLoading(false);
    }
  };

  // Listen for contract events
  useEffect(() => {
    if (!contract) return;

    const onGroupCreated = (groupId: any, name: any, contributionAmount: any) => {
      console.log('Group created:', { groupId: groupId.toString(), name, contributionAmount: contributionAmount.toString() });
      loadGroups();
    };

    const onJoinedGroup = (groupId: any, member: any) => {
      console.log('Member joined:', { groupId: groupId.toString(), member });
      loadGroups();
    };

    const onRoundWinner = (groupId: any, round: any, winner: any) => {
      console.log('Round winner:', { groupId: groupId.toString(), round: round.toString(), winner });
      alert(`Round ${round.toString()} winner: ${winner}`);
      loadGroups();
    };

    contract.on('GroupCreated', onGroupCreated);
    contract.on('JoinedGroup', onJoinedGroup);
    contract.on('RoundWinner', onRoundWinner);

    return () => {
      contract.off('GroupCreated', onGroupCreated);
      contract.off('JoinedGroup', onJoinedGroup);
      contract.off('RoundWinner', onRoundWinner);
    };
  }, [contract]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-800 mb-4">Arisan Web3 DApp</h1>
          <p className="text-lg text-gray-600 mb-8">Decentralized rotating savings and credit association</p>
          
          {!isConnected ? (
            <button
              onClick={connectWallet}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-8 rounded-lg shadow-lg transition duration-300 transform hover:scale-105"
            >
              Connect MetaMask
            </button>
          ) : (
            <div className="bg-white rounded-lg shadow-md p-4 inline-block">
              <p className="text-green-600 font-semibold">
                Connected: {account.slice(0, 6)}...{account.slice(-4)}
              </p>
            </div>
          )}
        </div>

        {isConnected && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left Column - Actions */}
            <div className="space-y-6">
              {/* Create Group */}
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h2 className="text-2xl font-bold text-gray-800 mb-4">Create New Group</h2>
                <div className="space-y-4">
                  <input
                    type="text"
                    placeholder="Group Name"
                    value={newGroupName}
                    onChange={(e) => setNewGroupName(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <input
                    type="number"
                    placeholder="Contribution Amount (ETH)"
                    value={newGroupAmount}
                    onChange={(e) => setNewGroupAmount(e.target.value)}
                    step="0.001"
                    min="0.001"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <button
                    onClick={createGroup}
                    disabled={loading || !newGroupName || !newGroupAmount}
                    className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-semibold py-3 px-6 rounded-lg transition duration-300"
                  >
                    {loading ? 'Creating...' : 'Create Group'}
                  </button>
                </div>
              </div>

              {/* Join Group */}
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h2 className="text-2xl font-bold text-gray-800 mb-4">Join Group</h2>
                <div className="space-y-4">
                  <input
                    type="number"
                    placeholder="Group ID"
                    value={joinGroupId}
                    onChange={(e) => setJoinGroupId(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <button
                    onClick={joinGroup}
                    disabled={loading || !joinGroupId}
                    className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-3 px-6 rounded-lg transition duration-300"
                  >
                    {loading ? 'Joining...' : 'Join Group'}
                  </button>
                </div>
              </div>

              {/* Deposit & Spin */}
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h2 className="text-2xl font-bold text-gray-800 mb-4">Group Actions</h2>
                <div className="space-y-4">
                  <input
                    type="number"
                    placeholder="Group ID for Deposit"
                    value={depositGroupId}
                    onChange={(e) => setDepositGroupId(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <button
                    onClick={depositToGroup}
                    disabled={loading || !depositGroupId}
                    className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white font-semibold py-3 px-6 rounded-lg transition duration-300"
                  >
                    {loading ? 'Depositing...' : 'Deposit Contribution'}
                  </button>

                  <input
                    type="number"
                    placeholder="Group ID for Spin"
                    value={spinGroupId}
                    onChange={(e) => setSpinGroupId(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <button
                    onClick={spinGroup}
                    disabled={loading || !spinGroupId}
                    className="w-full bg-orange-600 hover:bg-orange-700 disabled:bg-gray-400 text-white font-semibold py-3 px-6 rounded-lg transition duration-300"
                  >
                    {loading ? 'Spinning...' : 'Spin for Winner'}
                  </button>
                </div>
              </div>
            </div>

            {/* Right Column - Groups Display */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-800">Arisan Groups</h2>
                <button
                  onClick={loadGroups}
                  disabled={loading}
                  className="bg-gray-600 hover:bg-gray-700 text-white font-semibold py-2 px-4 rounded-lg transition duration-300"
                >
                  {loading ? 'Loading...' : 'Refresh'}
                </button>
              </div>

              {groups.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-gray-500 text-lg">No groups created yet. Create the first one!</p>
                </div>
              ) : (
                <div className="space-y-4 max-h-[600px] overflow-y-auto">
                  {groups.map((group) => (
                    <div key={group.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition duration-300">
                      <div className="flex justify-between items-start mb-3">
                        <h3 className="text-xl font-semibold text-gray-800">{group.name}</h3>
                        <span className="bg-blue-100 text-blue-800 text-sm font-medium px-3 py-1 rounded-full">
                          ID: {group.id}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 text-sm text-gray-600 mb-3">
                        <div>
                          <span className="font-semibold">Contribution:</span> {group.contributionAmount} ETH
                        </div>
                        <div>
                          <span className="font-semibold">Members:</span> {group.memberCount}
                        </div>
                        <div>
                          <span className="font-semibold">Balance:</span> {group.balance} ETH
                        </div>
                        <div>
                          <span className="font-semibold">Round:</span> {group.round}
                        </div>
                      </div>

                      <div className="flex space-x-2">
                        <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded">
                          Active
                        </span>
                        {parseFloat(group.balance) >= parseFloat(group.contributionAmount) * group.memberCount && (
                          <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded">
                            Ready to Spin
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Loading Overlay */}
        {loading && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-8 flex items-center space-x-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="text-gray-700">Processing transaction...</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}