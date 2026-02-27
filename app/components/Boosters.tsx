'use client';

import { useEffect } from 'react';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseEther } from 'viem';
import { CONTRACT_ADDRESS, CONTRACT_ABI } from '../contracts/abi';

const BOOSTERS = [
  { id: 1, multiplier: 'x1.2', color: '#A855F7', shadow: '#7C3AED', price: '0.0001' },
  { id: 2, multiplier: 'x1.5', color: '#EC4899', shadow: '#BE185D', price: '0.0002' },
  { id: 3, multiplier: 'x2.0', color: '#FACC15', shadow: '#A16207', price: '0.0005' },
];

export default function Boosters() {
  const { address, isConnected } = useAccount();

  const { data: playerData, refetch } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: CONTRACT_ABI,
    functionName: 'getPlayer',
    args: address ? [address] : undefined,
  });

  // Регистрация
  const { writeContract: registerPlayer, isPending: isRegistering, data: registerHash } = useWriteContract();
  const { isSuccess: isRegisterSuccess } = useWaitForTransactionReceipt({ hash: registerHash });

  // Mint Booster
  const { writeContract: mintBooster, isPending: isMinting, data: mintHash } = useWriteContract();
  const { isLoading: isMintConfirming, isSuccess: isMintSuccess } = useWaitForTransactionReceipt({ hash: mintHash });

  useEffect(() => {
    if (isRegisterSuccess || isMintSuccess) {
      refetch();
    }
  }, [isRegisterSuccess, isMintSuccess, refetch]);

  const isRegistered = playerData?.[0] ?? false;
  const ownedNFTs = playerData?.[5] ?? [];
  const ownedCount = Array.isArray(ownedNFTs) ? ownedNFTs.length : 0;

  const handleMint = (boosterId: number, price: string) => {
    // Если не зарегистрирован — сначала регистрируемся
    if (!isRegistered) {
      registerPlayer({
        address: CONTRACT_ADDRESS,
        abi: CONTRACT_ABI,
        functionName: 'registerPlayer',
      });
      return;
    }

    mintBooster({
      address: CONTRACT_ADDRESS,
      abi: CONTRACT_ABI,
      functionName: 'mintBoosterNFT',
      args: [BigInt(boosterId)],
      value: parseEther(price),
    });
  };

  if (!isConnected) return null;

  const isLoading = isRegistering || isMinting || isMintConfirming;

  return (
    <div className="flex flex-col gap-4">
      {BOOSTERS.map((booster) => {
        const owned = ownedCount >= booster.id;

        return (
          <button
            key={booster.id}
            onClick={() => !owned && !isLoading && handleMint(booster.id, booster.price)}
            disabled={owned || isLoading}
            className="booster-card"
            style={{
              backgroundColor: owned ? booster.color : '#666',
              boxShadow: owned
                ? `0 6px 0 ${booster.shadow}, inset 0 -4px 0 rgba(0,0,0,0.2), 0 0 20px ${booster.color}`
                : `0 6px 0 #444, inset 0 -4px 0 rgba(0,0,0,0.2)`,
              cursor: owned || isLoading ? 'default' : 'pointer',
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