import React, { useState } from 'react';
import { GitBranch, Plus, Trash2, ArrowRight, Save, Loader2 } from 'lucide-react';

interface Choice {
    text: string;
    nextChapterId: string;
}

interface StoryBranchingProps {
    chapters: any[];
    currentChoices: Choice[];
    onSave: (choices: Choice[]) => Promise<void>;
}

export const StoryBranching: React.FC<StoryBranchingProps> = ({
    chapters,
    currentChoices,
    onSave,
}) => {
    const [choices, setChoices] = useState<Choice[]>(currentChoices || []);
    const [loading, setLoading] = useState(false);

    const addChoice = () => {
        setChoices([...choices, { text: '', nextChapterId: '' }]);
    };

    const removeChoice = (index: number) => {
        setChoices(choices.filter((_, i) => i !== index));
    };

    const updateChoice = (index: number, field: keyof Choice, value: string) => {
        const newChoices = [...choices];
        newChoices[index] = { ...newChoices[index], [field]: value };
        setChoices(newChoices);
    };

    const handleSave = async () => {
        setLoading(true);
        try {
            await onSave(choices);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-4 p-4 bg-gray-50 rounded-2xl border border-black/5">
            <div className="flex items-center justify-between">
                <h3 className="font-bold flex items-center gap-2">
                    <GitBranch className="w-4 h-4" />
                    Branching Paths
                </h3>
                <button
                    onClick={addChoice}
                    className="p-2 bg-black text-white rounded-full hover:scale-110 transition-transform"
                >
                    <Plus className="w-4 h-4" />
                </button>
            </div>

            {choices.length === 0 ? (
                <p className="text-sm text-black/40 text-center py-4 bg-white rounded-xl border border-dashed border-black/10">
                    No branches yet. Click + to add one.
                </p>
            ) : (
                <div className="space-y-3">
                    {choices.map((choice, idx) => (
                        <div key={idx} className="flex flex-col gap-2 p-3 bg-white rounded-xl border border-black/5 shadow-sm">
                            <input
                                placeholder="Option text (e.g., 'Go left')"
                                className="w-full text-sm font-medium border-none focus:ring-0 p-0"
                                value={choice.text}
                                onChange={(e) => updateChoice(idx, 'text', e.target.value)}
                            />
                            <div className="flex items-center gap-2 mt-1">
                                <ArrowRight className="w-3 h-3 text-black/40" />
                                <select
                                    className="flex-1 text-xs border-none bg-gray-50 rounded-lg focus:ring-0"
                                    value={choice.nextChapterId}
                                    onChange={(e) => updateChoice(idx, 'nextChapterId', e.target.value)}
                                >
                                    <option value="">Select Target Chapter</option>
                                    {chapters.map(ch => (
                                        <option key={ch._id} value={ch._id}>
                                            Chapter {ch.order}: {ch.title}
                                        </option>
                                    ))}
                                </select>
                                <button
                                    onClick={() => removeChoice(idx)}
                                    className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {choices.length > 0 && (
                <button
                    onClick={handleSave}
                    disabled={loading}
                    className="w-full py-2.5 bg-black text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50"
                >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    Save Paths
                </button>
            )}
        </div>
    );
};
