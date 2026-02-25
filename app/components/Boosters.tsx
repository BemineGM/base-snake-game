'use client';

import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseEther } from 'viem';
import { CONTRACT_ADDRESS, CONTRACT_ABI } from '../contracts/abi';

const BOOSTERS = [
  { id: 1, multiplier: 'x1.2', color: '#A855F7', shadow: '#7C3AED' },
  { id: 2, multiplier: 'x1.5', color: '#EC4899', shadow: '#BE185D' },
  { id: 3, multiplier: 'x2.0', color: '#FACC15', shadow: '#A16207' },
];

const BOOSTER_PRICE = '0.00001';

export default function Boosters() {
  const { address, isConnected } = useAccount();

  const { data: playerData, refetch } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: CONTRACT_ABI,
    functionName: 'getPlayer',
    args: address ? [address] : undefined,
  });

  const { data: mintHash, writeContract: mintBooster, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash: mintHash });

  if (isSuccess) {
    refetch();
  }

  const isRegistered = playerData?.[0] ?? false;
  const ownedNFTs = playerData?.[5] ?? [];

  const handleMint = (boosterId: number) => {
    if (!isRegistered) return;

    mintBooster({
      address: CONTRACT_ADDRESS,
      abi: CONTRACT_ABI,
      functionName: 'mintBoosterNFT',
      args: [BigInt(boosterId)],
      value: parseEther(BOOSTER_PRICE),
    });
  };

  if (!isConnected) return null;

  return (
    <div className="flex flex-col gap-4">
      <p className="pixel-text text-[10px] text-white text-center mb-2">BOOSTERS</p>
      {BOOSTERS.map((booster) => {
        const owned = ownedNFTs.length >= booster.id;

        return (
          <button
            key={booster.id}
            onClick={() => handleMint(booster.id)}
            disabled={isPending || isConfirming || !isRegistered || owned}
            className="booster-card"
            style={{
              backgroundColor: booster.color,
              boxShadow: `0 6px 0 ${booster.shadow}, inset 0 -4px 0 rgba(0,0,0,0.2)`,
              opacity: owned ? 1 : 0.7,
            }}
          >
            <span className="text-lg">{booster.multiplier}</span>
            <span className="text-[8px] mt-1">{owned ? '✓ OWNED' : 'BOOST'}</span>
          </button>
        );
      })}
    </div>
  );
}