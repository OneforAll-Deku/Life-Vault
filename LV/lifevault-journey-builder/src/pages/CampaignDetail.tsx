
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { campaignAPI, questAPI } from '@/services/questApi';
import {
    ArrowLeft, MapPin, Trophy, CheckCircle, ChevronRight,
    Loader2, Target, Star, Gift, Users, Navigation
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

// Fix leaflet icons
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

const createNumberIcon = (num: number, completed: boolean) => {
    return L.divIcon({
        className: 'campaign-quest-marker',
        html: `<div style="
      width: 36px; height: 36px;
      background: ${completed ? '#22c55e' : '#3b82f6'};
      border: 3px solid white;
      border-radius: 50%;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
      display: flex; align-items: center; justify-content: center;
      color: white; font-weight: 800; font-size: 16px;
    ">${completed ? '✓' : num}</div>`,
        iconSize: [36, 36],
        iconAnchor: [18, 36],
        popupAnchor: [0, -36],
    });
};

const CampaignDetail: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { toast } = useToast();
    const [campaign, setCampaign] = useState<any>(null);
    const [quests, setQuests] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetchCampaign();
    }, [id]);

    const fetchCampaign = async () => {
        setLoading(true);
        try {
            const res = await campaignAPI.getOne(id!);
            setCampaign(res.data.data.campaign || res.data.data);

            // Fetch quests for this campaign
            const questRes = await questAPI.getAll({ campaignId: id, status: 'all', limit: 50 });
            setQuests(questRes.data?.data?.quests || questRes.data?.data || []);
        } catch (err) {
            console.error(err);
            setError('Failed to load campaign');
        }
        setLoading(false);
    };

    if (loading) {
        return (
            <DashboardLayout>
                <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
                    <Loader2 className="animate-spin" size={40} color="#3b82f6" />
                </div>
            </DashboardLayout>
        );
    }

    if (!campaign) {
        return (
            <DashboardLayout>
                <div style={{ textAlign: 'center', padding: 48 }}>
                    <p style={{ fontSize: 48 }}>😕</p>
                    <h2>Campaign not found</h2>
                    <button onClick={() => navigate('/campaigns')} style={{
                        padding: '10px 24px', background: '#111', color: 'white',
                        border: 'none', borderRadius: 10, cursor: 'pointer'
                    }}>
                        Back to Campaigns
                    </button>
                </div>
            </DashboardLayout>
        );
    }

    // Get quest locations for the map route
    const questLocations = quests
        .filter(q => q.location?.coordinates?.coordinates?.length === 2)
        .map((q, i) => ({
            position: [q.location.coordinates.coordinates[1], q.location.coordinates.coordinates[0]] as [number, number],
            quest: q,
            number: i + 1,
            completed: q.userCompleted || false,
        }));

    const routeLine = questLocations.map(ql => ql.position);
    const mapCenter = questLocations.length > 0
        ? questLocations[0].position
        : [20.5937, 78.9629] as [number, number];

    const completedCount = quests.filter(q => q.userCompleted).length;
    const progressPercent = quests.length > 0 ? Math.round((completedCount / quests.length) * 100) : 0;

    return (
        <DashboardLayout>
            <button
                onClick={() => navigate('/campaigns')}
                style={{
                    display: 'flex', alignItems: 'center', gap: 6, padding: '8px 0',
                    background: 'none', border: 'none', cursor: 'pointer', color: '#666',
                    fontSize: 14, fontWeight: 500, marginBottom: 16
                }}
            >
                <ArrowLeft size={18} /> Back to Campaigns
            </button>

            {/* Campaign Header */}
            <div style={{
                background: campaign.coverImage
                    ? `linear-gradient(rgba(0,0,0,0.4), rgba(0,0,0,0.6)), url(${campaign.coverImage}) center/cover`
                    : 'linear-gradient(135deg, #667eea, #764ba2)',
                borderRadius: 16, padding: 32, marginBottom: 24, color: 'white'
            }}>
                <h1 style={{ fontSize: 28, fontWeight: 800, margin: '0 0 8px' }}>{campaign.name}</h1>
                <p style={{ fontSize: 15, opacity: 0.9, margin: '0 0 20px', lineHeight: 1.5 }}>
                    {campaign.description}
                </p>

                {/* Progress */}
                <div style={{
                    background: 'rgba(255,255,255,0.15)', borderRadius: 12, padding: 16
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                        <span style={{ fontSize: 14, fontWeight: 600 }}>
                            Progress: {completedCount} / {quests.length} quests
                        </span>
                        <span style={{ fontSize: 14, fontWeight: 700 }}>{progressPercent}%</span>
                    </div>
                    <div style={{
                        width: '100%', height: 10, background: 'rgba(255,255,255,0.2)',
                        borderRadius: 5, overflow: 'hidden'
                    }}>
                        <div style={{
                            width: `${progressPercent}%`, height: '100%', borderRadius: 5,
                            background: progressPercent >= 100 ? '#22c55e' : '#f59e0b',
                            transition: 'width 0.5s ease'
                        }} />
                    </div>
                    {progressPercent >= 100 && (
                        <div style={{ marginTop: 10, fontSize: 14, fontWeight: 700, color: '#22c55e' }}>
                            🎉 Campaign Completed! You've earned the grand prize!
                        </div>
                    )}
                </div>
            </div>

            {/* Grand Prize */}
            {campaign.rewards?.grandPrize && (
                <div style={{
                    background: 'linear-gradient(135deg, #fef3c7, #fef9c3)',
                    borderRadius: 14, padding: 20, marginBottom: 24, border: '1px solid #fde68a',
                    display: 'flex', alignItems: 'center', gap: 16
                }}>
                    <div style={{
                        width: 56, height: 56, borderRadius: '50%', background: '#f59e0b',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                    }}>
                        <Gift size={28} color="white" />
                    </div>
                    <div>
                        <h3 style={{ fontSize: 16, fontWeight: 700, color: '#92400e', margin: '0 0 4px' }}>
                            🏆 Grand Prize — Complete all {quests.length} quests to win!
                        </h3>
                        <p style={{ fontSize: 14, color: '#a16207', margin: 0 }}>
                            {campaign.rewards.grandPrize.description || `${campaign.rewards.grandPrize.aptAmount} APT`}
                        </p>
                    </div>
                </div>
            )}

            {/* Quest Route Map */}
            {questLocations.length > 0 && (
                <div style={{ marginBottom: 24 }}>
                    <h2 style={{ fontSize: 20, fontWeight: 700, margin: '0 0 12px' }}>📍 Quest Route</h2>
                    <div style={{ borderRadius: 14, overflow: 'hidden', border: '1px solid #e5e7eb' }}>
                        <MapContainer center={mapCenter} zoom={13} style={{ height: 350, width: '100%' }}>
                            <TileLayer
                                attribution='&copy; OpenStreetMap'
                                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                            />
                            {questLocations.map((ql) => (
                                <Marker
                                    key={ql.quest._id}
                                    position={ql.position}
                                    icon={createNumberIcon(ql.number, ql.completed)}
                                >
                                    <Popup>
                                        <div style={{ minWidth: 180 }}>
                                            <h4 style={{ margin: '0 0 4px', fontWeight: 700 }}>
                                                #{ql.number} {ql.quest.title}
                                            </h4>
                                            <p style={{ margin: '0 0 8px', fontSize: 12, color: '#666' }}>
                                                {ql.completed ? '✅ Completed' : '📍 Not visited yet'}
                                            </p>
                                            {!ql.completed && (
                                                <button
                                                    onClick={() => navigate(`/quests/${ql.quest._id}`)}
                                                    style={{
                                                        width: '100%', padding: '6px', background: '#3b82f6',
                                                        color: 'white', border: 'none', borderRadius: 6,
                                                        fontSize: 12, fontWeight: 600, cursor: 'pointer'
                                                    }}
                                                >
                                                    Start Quest →
                                                </button>
                                            )}
                                        </div>
                                    </Popup>
                                </Marker>
                            ))}
                            {routeLine.length > 1 && (
                                <Polyline
                                    positions={routeLine}
                                    pathOptions={{ color: '#3b82f6', weight: 3, dashArray: '10, 6', opacity: 0.6 }}
                                />
                            )}
                        </MapContainer>
                    </div>
                </div>
            )}

            {/* Quest List */}
            <h2 style={{ fontSize: 20, fontWeight: 700, margin: '0 0 12px' }}>
                🎯 Quests to Complete ({completedCount}/{quests.length})
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {quests.map((quest, index) => (
                    <div
                        key={quest._id}
                        onClick={() => {
                            toast({
                                title: "Quest Selected",
                                description: `Preparing mission: ${quest.title}...`
                            });
                            navigate(`/quests/${quest._id}`);
                        }}
                        style={{
                            background: 'white', borderRadius: 14, border: '1px solid #e5e7eb',
                            padding: 16, display: 'flex', alignItems: 'center', gap: 16,
                            cursor: 'pointer', transition: 'all 0.2s',
                            opacity: quest.userCompleted ? 0.7 : 1
                        }}
                        onMouseEnter={(e) => {
                            (e.currentTarget as HTMLDivElement).style.transform = 'translateX(4px)';
                            (e.currentTarget as HTMLDivElement).style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)';
                        }}
                        onMouseLeave={(e) => {
                            (e.currentTarget as HTMLDivElement).style.transform = 'translateX(0)';
                            (e.currentTarget as HTMLDivElement).style.boxShadow = 'none';
                        }}
                    >
                        {/* Number */}
                        <div style={{
                            width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
                            background: quest.userCompleted ? '#22c55e' : '#3b82f6',
                            color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontWeight: 800, fontSize: 16
                        }}>
                            {quest.userCompleted ? '✓' : index + 1}
                        </div>

                        {/* Info */}
                        <div style={{ flex: 1 }}>
                            <h3 style={{
                                fontSize: 15, fontWeight: 700, margin: '0 0 2px', color: '#111',
                                textDecoration: quest.userCompleted ? 'line-through' : 'none'
                            }}>
                                {quest.title}
                            </h3>
                            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                                {quest.location?.name && (
                                    <span style={{ fontSize: 12, color: '#888', display: 'flex', alignItems: 'center', gap: 4 }}>
                                        <MapPin size={12} /> {quest.location.name}
                                    </span>
                                )}
                                {quest.rewards?.points > 0 && (
                                    <span style={{ fontSize: 12, color: '#f59e0b', fontWeight: 600 }}>
                                        🏆 {quest.rewards.points} pts
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Status */}
                        <div>
                            {quest.userCompleted ? (
                                <CheckCircle size={24} color="#22c55e" />
                            ) : (
                                <ChevronRight size={20} color="#ccc" />
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </DashboardLayout>
    );
};

export default CampaignDetail;
