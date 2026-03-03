import React from 'react';
import { Calendar, Users, GitBranch, Lock, Unlock, Eye, MapPin, Clock } from 'lucide-react';

interface StoryCardProps {
    story: any;
    isCreator: boolean;
    onClick: () => void;
}

export const StoryCard: React.FC<StoryCardProps> = ({ story, isCreator, onClick }) => {
    const isCollaborative = story.isCollaborative;
    const isInteractive = story.isInteractive;

    return (
        <div
            onClick={onClick}
            className="group relative bg-white border border-black/5 rounded-2xl p-4 cursor-pointer hover:border-black/20 hover:shadow-xl transition-all duration-300 overflow-hidden"
        >
            {/* Background patterns could go here */}

            <div className="flex gap-4">
                {/* Cover Thumbnail */}
                <div className="w-20 h-20 bg-gray-100 rounded-xl overflow-hidden flex-shrink-0 border border-black/5">
                    {story.coverImage ? (
                        <img src={story.coverImage} alt="" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-black/10">
                            <Lock className="w-6 h-6" />
                        </div>
                    )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-bold text-black truncate">{story.title}</h3>
                        {isCollaborative && (
                            <Users className="w-3 h-3 text-indigo-500" />
                        )}
                        {isInteractive && (
                            <GitBranch className="w-3 h-3 text-emerald-500" />
                        )}
                    </div>

                    <p className="text-xs text-black/50 line-clamp-2 mb-3">
                        {story.description || 'A mysterious story waiting to be unlocked...'}
                    </p>

                    <div className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-wider text-black/40">
                        <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {new Date(story.createdAt).toLocaleDateString()}
                        </span>
                        <span className="flex items-center gap-1">
                            <Eye className="w-3 h-3" />
                            {story.totalChapters || 0} Chapters
                        </span>
                        {isCreator && (
                            <span className="bg-black text-white px-1.5 py-0.5 rounded">Owner</span>
                        )}
                    </div>
                </div>
            </div>

            {/* Status Overlay for locked stories */}
            {!story.isUnlocked && (
                <div className="absolute top-4 right-4 flex gap-1">
                    <div className="bg-orange-50 text-orange-600 p-1 rounded-md border border-orange-200">
                        <Lock className="w-3 h-3" />
                    </div>
                </div>
            )}
        </div>
    );
};
