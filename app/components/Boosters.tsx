'use client';

import { useEffect } from 'react';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseEther } from 'viem';
import { CONTRACT_ADDRESS, CONTRACT_ABI } from '../contracts/abi';

const BOOSTERS = [
  { id: 1, multiplier: 'x1.2', color: '#A855F7', shadow: '#7C3AED' },
  { id: 2, multiplier: 'x1.5', color: '#EC4899', shadow: '#BE185D' },
  { id: 3, multiplier: 'x2.0', color: '#FACC15', shadow: '#A16207' },
];

const BOOSTER_PRICE = '0.0001';

export default function Boosters() {
  const { address, isConnected } = useAccount();

  const { data: playerData, refetch: refetchPlayer } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: CONTRACT_ABI,
    functionName: 'getPlayer',
    args: address ? [address] : undefined,
  });

  const { data: boostersData, refetch: refetchBoosters } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: CONTRACT_ABI,
    functionName: 'getPlayerBoosters',
    args: address ? [address] : undefined,
  });

  const { writeContract: mintBooster, isPending, data: mintHash } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash: mintHash });

  useEffect(() => {
    if (isSuccess) {
      refetchPlayer();
      refetchBoosters();
    }
  }, [isSuccess, refetchPlayer, refetchBoosters]);

  const isRegistered = playerData?.[0] ?? false;
  const ownedBoosters = boostersData ?? [];

  const handleMint = (boosterId: number) => {
    mintBooster({
      address: CONTRACT_ADDRESS,
      abi: CONTRACT_ABI,
      functionName: 'mintBooster',
      args: [BigInt(boosterId)],
      value: parseEther(BOOSTER_PRICE),
      gas: BigInt(200000),
    });
  };

  if (!isConnected) return null;

  const isLoading = isPending || isConfirming;

  return (
    <div className="flex flex-col gap-4">
      {BOOSTERS.map((booster) => {
        const owned = Array.isArray(ownedBoosters) && ownedBoosters.some(b => Number(b) === booster.id);

        return (
          <button
            key={booster.id}
            onClick={() => !owned && !isLoading && isRegistered && handleMint(booster.id)}
            disabled={owned || isLoading || !isRegistered}
            className="booster-card"
            style={{
              backgroundColor: owned ? booster.color : '#666',
              boxShadow: owned
                ? `0 6px 0 ${booster.shadow}, inset 0 -4px 0 rgba(0,0,0,0.2), 0 0 20px ${booster.color}`
                : `0 6px 0 #444, inset 0 -4px 0 rgba(0,0,0,0.2)`,
              cursor: owned || isLoading || !isRegistered ? 'default' : 'pointer',
              opacity: isLoading ? 0.5 : 1,
            }}
          >
            <span className="text-lg">{booster.multiplier}</span>
            <span className="text-[8px] mt-1">
              {isLoading ? '...' : owned ? '✓ OWNED' : 'BOOST'}
            </span>
          </button>
        );
      })}
    </div>
  );
}