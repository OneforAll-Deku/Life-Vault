import React from 'react';
import { useWallet } from '@/context/WalletContext';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
    DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Network, Globe, ChevronDown, Check, Coins } from 'lucide-react';
import { cn } from '@/lib/utils';

const NETWORKS = [
    { id: 'mainnet', name: 'Mainnet', color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
    { id: 'testnet', name: 'Testnet', color: 'text-amber-500', bg: 'bg-amber-500/10' },
    { id: 'devnet', name: 'Devnet', color: 'text-indigo-500', bg: 'bg-indigo-500/10' },
];

export const NetworkSelector: React.FC = () => {
    const { selectedNetwork, switchNetwork, balance, connected } = useWallet();

    const currentNetwork = NETWORKS.find(n => n.id === selectedNetwork) || NETWORKS[2];

    return (
        <div className="flex items-center gap-2">
            {connected && balance !== null && (
                <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-gray-50 border border-gray-100 rounded-xl mr-1">
                    <Coins className="w-3.5 h-3.5 text-indigo-500" />
                    <span className="text-[11px] font-black text-gray-900 leading-none">
                        {balance.toFixed(4)} APT
                    </span>
                </div>
            )}

            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button
                        variant="outline"
                        size="sm"
                        className={cn(
                            "h-9 px-3 rounded-xl border-gray-100 bg-white/50 backdrop-blur-sm hover:bg-gray-50 transition-all flex items-center gap-2 font-bold text-xs ring-offset-background focus-visible:ring-2 focus-visible:ring-indigo-500",
                            currentNetwork.color
                        )}
                    >
                        <div className={cn("w-2 h-2 rounded-full", currentNetwork.bg.replace('/10', ''), "animate-pulse")} />
                        <span className="text-gray-900">{currentNetwork.name}</span>
                        <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48 p-1.5 rounded-2xl border-gray-100 shadow-xl shadow-gray-200/50">
                    <DropdownMenuLabel className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-2 py-2">
                        Switch Network
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator className="bg-gray-50" />
                    {NETWORKS.map((net) => (
                        <DropdownMenuItem
                            key={net.id}
                            onClick={() => switchNetwork(net.id)}
                            className={cn(
                                "flex items-center justify-between px-2 py-2 rounded-xl cursor-pointer transition-all",
                                selectedNetwork === net.id ? "bg-indigo-50 text-indigo-600 font-bold" : "hover:bg-gray-50 text-gray-600 font-medium"
                            )}
                        >
                            <div className="flex items-center gap-2.5">
                                <div className={cn("w-2 h-2 rounded-full", selectedNetwork === net.id ? "bg-indigo-500" : net.color.replace('text-', 'bg-'))} />
                                <span className="text-sm">{net.name}</span>
                            </div>
                            {selectedNetwork === net.id && <Check className="w-4 h-4" />}
                        </DropdownMenuItem>
                    ))}
                    <DropdownMenuSeparator className="bg-gray-50" />
                    <div className="px-2 py-2">
                        <p className="text-[9px] text-gray-400 leading-relaxed italic">
                            Proactive network switching ensures your memories are stored on your preferred Aptos environment.
                        </p>
                    </div>
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
    );
};
