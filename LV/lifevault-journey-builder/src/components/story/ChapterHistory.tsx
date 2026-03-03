import React, { useEffect, useState } from 'react';
import { Clock, ArrowLeft, Loader2, AlertCircle, History, User } from 'lucide-react';
import { storyAPI } from '@/services/questApi';
import { StoryChapterVersion } from '@/types';

interface ChapterHistoryProps {
    storyId: string;
    chapterId: string;
    onClose: () => void;
}

export const ChapterHistory: React.FC<ChapterHistoryProps> = ({
    storyId,
    chapterId,
    onClose,
}) => {
    const [versions, setVersions] = useState<StoryChapterVersion[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedVersions, setSelectedVersions] = useState<number[]>([]);

    useEffect(() => {
        fetchHistory();
    }, [chapterId]);

    const fetchHistory = async () => {
        try {
            setLoading(true);
            const res = await storyAPI.getChapterHistory(storyId, chapterId);
            setVersions(res.data.data);
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to load history');
        } finally {
            setLoading(false);
        }
    };

    const toggleVersionSelection = (index: number) => {
        if (selectedVersions.includes(index)) {
            setSelectedVersions(selectedVersions.filter(i => i !== index));
        } else if (selectedVersions.length < 2) {
            setSelectedVersions([...selectedVersions, index].sort((a, b) => b - a));
        }
    };

    const getDiff = (v1: string, v2: string) => {
        // Basic diff visualization could be added here
        return { v1, v2 };
    };

    return (
        <div className="flex flex-col h-full bg-white">
            <div className="flex items-center gap-3 p-4 border-b border-black/5">
                <button onClick={onClose} className="p-2 hover:bg-black/5 rounded-full">
                    <ArrowLeft className="w-5 h-5" />
                </button>
                <h3 className="font-bold text-lg flex items-center gap-2">
                    <History className="w-5 h-5" />
                    Version History
                </h3>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <Loader2 className="w-8 h-8 animate-spin text-black/20" />
                    </div>
                ) : error ? (
                    <div className="p-4 bg-red-50 text-red-600 rounded-xl flex items-center gap-3">
                        <AlertCircle className="w-5 h-5" />
                        {error}
                    </div>
                ) : versions.length === 0 ? (
                    <div className="text-center py-20 text-black/40">
                        <Clock className="w-12 h-12 mx-auto mb-3 opacity-20" />
                        <p>No history found for this chapter.</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        <p className="text-xs text-black/40 font-medium uppercase tracking-wider mb-2">
                            Select two versions to compare (Max 2)
                        </p>
                        {versions.map((version, idx) => (
                            <div
                                key={idx}
                                onClick={() => toggleVersionSelection(idx)}
                                className={`p-4 rounded-xl border-2 transition-all cursor-pointer ${selectedVersions.includes(idx)
                                        ? 'border-black bg-black/5'
                                        : 'border-black/5 bg-gray-50 hover:border-black/20'
                                    }`}
                            >
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                        <div className="w-8 h-8 rounded-full bg-black/5 flex items-center justify-center">
                                            <User className="w-4 h-4 text-black/40" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold">
                                                {(version.authorId as any)?.name || 'Unknown Author'}
                                            </p>
                                            <p className="text-[10px] text-black/40 uppercase">
                                                {new Date(version.createdAt).toLocaleString()}
                                            </p>
                                        </div>
                                    </div>
                                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${selectedVersions.includes(idx) ? 'bg-black border-black' : 'border-black/10'
                                        }`}>
                                        {selectedVersions.includes(idx) && (
                                            <span className="text-[10px] text-white font-bold">
                                                {selectedVersions.indexOf(idx) + 1}
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <p className="text-sm text-black/70 mb-2 italic">"{version.commitMessage}"</p>

                                {selectedVersions.includes(idx) && (
                                    <div className="mt-3 p-3 bg-white rounded-lg border border-black/5 text-xs text-black/60 font-mono line-clamp-3">
                                        {version.content?.text || JSON.stringify(version.content)}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {selectedVersions.length === 2 && (
                <div className="p-4 border-t border-black/5 bg-gray-50">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <p className="text-[10px] font-bold uppercase text-black/40">Earlier Version</p>
                            <div className="p-3 bg-red-50 text-red-700 rounded-lg text-xs break-words">
                                {versions[selectedVersions[1]].content?.text || 'No text content'}
                            </div>
                        </div>
                        <div className="space-y-2">
                            <p className="text-[10px] font-bold uppercase text-black/40">Later Version</p>
                            <div className="p-3 bg-green-50 text-green-700 rounded-lg text-xs break-words">
                                {versions[selectedVersions[0]].content?.text || 'No text content'}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
