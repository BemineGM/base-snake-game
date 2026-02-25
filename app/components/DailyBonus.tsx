'use client';

import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { CONTRACT_ADDRESS, CONTRACT_ABI } from '../contracts/abi';

export default function DailyBonus() {
  const { address, isConnected } = useAccount();

  const { data: playerData, refetch } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: CONTRACT_ABI,
    functionName: 'getPlayer',
    args: address ? [address] : undefined,
  });

  const { data: dailyHash, writeContract: claimDaily, isPending: isDailyPending } = useWriteContract();
  const { isLoading: isDailyConfirming, isSuccess: isDailySuccess } = useWaitForTransactionReceipt({ hash: dailyHash });

  const { data: bonusHash, writeContract: claimBonus, isPending: isBonusPending } = useWriteContract();
  const { isLoading: isBonusConfirming, isSuccess: isBonusSuccess } = useWaitForTransactionReceipt({ hash: bonusHash });

  if (isDailySuccess || isBonusSuccess) {
    refetch();
  }

  if (!isConnected) return null;

  const isRegistered = playerData?.[0] ?? false;
  const lastDailyClaim = playerData?.[3] ?? BigInt(0);
  const lastBonusClaim = playerData?.[4] ?? BigInt(0);

  const now = BigInt(Math.floor(Date.now() / 1000));
  const canClaimDaily = now - lastDailyClaim >= BigInt(86400);
  const canClaimBonus = now - lastBonusClaim >= BigInt(43200);

  const handleClaimDaily = () => {
    claimDaily({
      address: CONTRACT_ADDRESS,
      abi: CONTRACT_ABI,
      functionName: 'claimDailyReward',
    });
  };

  const handleClaimBonus = () => {
    claimBonus({
      address: CONTRACT_ADDRESS,
      abi: CONTRACT_ABI,
      functionName: 'claimBonus',
    });
  };

  if (!isRegistered) return null;

  return (
    <div className="bg-[#1E2025] rounded-2xl p-4 border border-gray-700">
      <h3 className="text-lg font-bold text-white mb-3">🎁 Rewards</h3>

      <div className="space-y-2">
        <button
          onClick={handleClaimDaily}
          disabled={!canClaimDaily || isDailyPending || isDailyConfirming}
          className="w-full py-3 bg-[#0052FF] hover:bg-[#0047E1] disabled:bg-gray-700 disabled:text-gray-500 rounded-xl text-white font-medium transition-all"
        >
          {isDailyPending || isDailyConfirming ? '⏳ Claiming...' : canClaimDaily ? 'Daily +1 pt' : '✓ Daily claimed'}
        </button>

        <button
          onClick={handleClaimBonus}
          disabled={!canClaimBonus || isBonusPending || isBonusConfirming}
          className="w-full py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-700 disabled:text-gray-500 rounded-xl text-white font-medium transition-all"
        >
          {isBonusPending || isBonusConfirming ? '⏳ Claiming...' : canClaimBonus ? 'Bonus +1 pt (12h)' : '✓ Bonus claimed'}
        </button>
      </div>
    </div>
  );
}