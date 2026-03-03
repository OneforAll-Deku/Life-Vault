
import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Circle } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { questAPI } from '@/services/questApi';
import { fileToBase64 } from '@/services/api';
import {
    ArrowLeft, MapPin, Clock, Star, Trophy, Camera, Upload,
    CheckCircle, XCircle, Loader2, Navigation, Zap, Award
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

// Fix leaflet icons
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

const questIcon = L.divIcon({
    className: 'quest-detail-marker',
    html: `<div style="width:40px;height:40px;background:#f59e0b;border: 3px solid white;border-radius:50%;box-shadow:0 2px 8px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;">
    <span style="color:white;font-size:18px;">📍</span></div>`,
    iconSize: [40, 40],
    iconAnchor: [20, 40],
});

const QuestDetail: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { toast } = useToast();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [quest, setQuest] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [attemptId, setAttemptId] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [submissionResult, setSubmissionResult] = useState<any>(null);
    const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
    const [photoPreview, setPhotoPreview] = useState<string | null>(null);
    const [userLocation, setUserLocation] = useState<{ lat: number; lng: number; accuracy?: number } | null>(null);
    const [step, setStep] = useState<'info' | 'started' | 'photo' | 'result'>('info');
    const [canAttempt, setCanAttempt] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetchQuest();
        getCurrentLocation();
    }, [id]);

    const fetchQuest = async () => {
        setLoading(true);
        try {
            const res = await questAPI.getOne(id!);
            setQuest(res.data.data.quest || res.data.data);
            setCanAttempt(res.data.data.canAttempt);
        } catch (err) {
            console.error(err);
            setError('Failed to load quest');
        }
        setLoading(false);
    };

    const getCurrentLocation = () => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy });
                    toast({
                        title: "Location Locked",
                        description: `Coordinates synced for quest verification.`
                    });
                },
                () => {
                    console.warn('Could not get location');
                    toast({
                        title: "GPS Alert",
                        description: "Could not access location. This may affect quest completion.",
                        variant: "destructive"
                    });
                },
                { enableHighAccuracy: true, timeout: 15000 }
            );
        }
    };

    const handleStartQuest = async () => {
        try {
            setError(null);
            const res = await questAPI.startAttempt(id!);
            setAttemptId(res.data.data.attemptId);
            setStep('started');
            toast({
                title: "Quest Activated",
                description: "Good luck, adventurer! Your journey has begun."
            });
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to start quest');
            toast({
                title: "Activation Error",
                description: err.response?.data?.message || 'Failed to start quest',
                variant: "destructive"
            });
        }
    };

    const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const preview = URL.createObjectURL(file);
        setPhotoPreview(preview);

        const base64 = await fileToBase64(file);
        setSelectedPhoto(base64);
        setStep('photo');
        toast({
            title: "Evidence Captured",
            description: "Photo ready for AI verification."
        });
    };

    const handleSubmit = async () => {
        setSubmitting(true);
        setError(null);
        try {
            const payload: any = {
                attemptId,
                capturedAt: new Date().toISOString(),
            };

            if (selectedPhoto) {
                payload.photoBase64 = selectedPhoto;
            }

            if (userLocation) {
                payload.location = {
                    latitude: userLocation.lat,
                    longitude: userLocation.lng,
                    accuracy: userLocation.accuracy,
                };
            }

            const res = await questAPI.submitCompletion(id!, payload);
            setSubmissionResult(res.data);
            setStep('result');

            if (res.data?.success) {
                toast({
                    title: "Success!",
                    description: "Quest completed and rewards claimed."
                });
            } else {
                toast({
                    title: "Verification Failed",
                    description: res.data?.message || "Something went wrong.",
                    variant: "destructive"
                });
            }

            // Trigger global refresh so Timeline stats reflect new APT balance
            try {
                window.dispatchEvent(new Event('block-pix:refresh'));
            } catch {
                // ignore
            }
        } catch (err: any) {
            const data = err.response?.data;
            if (data?.data) {
                setSubmissionResult(data);
            }
            setError(data?.message || 'Submission failed');
            setStep('result');
        }
        setSubmitting(false);
    };

    if (loading) {
        return (
            <DashboardLayout>
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
                    <Loader2 className="animate-spin" size={40} color="#3b82f6" />
                </div>
            </DashboardLayout>
        );
    }

    if (!quest) {
        return (
            <DashboardLayout>
                <div style={{ textAlign: 'center', padding: 48 }}>
                    <p style={{ fontSize: 48, marginBottom: 12 }}>😕</p>
                    <h2 style={{ fontSize: 20, fontWeight: 600 }}>Quest not found</h2>
                    <button onClick={() => navigate('/quests')} style={{
                        marginTop: 16, padding: '10px 24px', background: '#111', color: 'white',
                        border: 'none', borderRadius: 10, cursor: 'pointer', fontWeight: 600
                    }}>
                        Back to Map
                    </button>
                </div>
            </DashboardLayout>
        );
    }

    const questLat = quest.location?.coordinates?.coordinates?.[1];
    const questLng = quest.location?.coordinates?.coordinates?.[0];
    const hasLocation = questLat && questLng;

    const getDifficultyColor = (d: string) => {
        switch (d) {
            case 'easy': return '#22c55e';
            case 'medium': return '#f59e0b';
            case 'hard': return '#ef4444';
            case 'expert': return '#8b5cf6';
            default: return '#6b7280';
        }
    };

    return (
        <DashboardLayout>
            {/* Back button */}
            <button
                onClick={() => navigate('/quests')}
                style={{
                    display: 'flex', alignItems: 'center', gap: 6, padding: '8px 0',
                    background: 'none', border: 'none', cursor: 'pointer', color: '#666',
                    fontSize: 14, fontWeight: 500, marginBottom: 16
                }}
            >
                <ArrowLeft size={18} /> Back to Quest Map
            </button>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 24, alignItems: 'start' }}>
                {/* Left - Quest Info */}
                <div>
                    {/* Hero */}
                    <div style={{
                        background: `linear-gradient(135deg, ${getDifficultyColor(quest.difficulty)}22, ${getDifficultyColor(quest.difficulty)}08)`,
                        borderRadius: 16, padding: 32, marginBottom: 20, border: '1px solid #e5e7eb'
                    }}>
                        <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
                            <span style={{
                                padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700,
                                background: getDifficultyColor(quest.difficulty), color: 'white'
                            }}>
                                {quest.difficulty?.toUpperCase()}
                            </span>
                            <span style={{
                                padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                                background: 'white', color: '#555', border: '1px solid #e5e7eb'
                            }}>
                                {quest.category}
                            </span>
                            <span style={{
                                padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                                background: quest.status === 'active' ? '#dcfce7' : '#fef3c7',
                                color: quest.status === 'active' ? '#16a34a' : '#ca8a04'
                            }}>
                                {quest.status}
                            </span>
                        </div>
                        <h1 style={{ fontSize: 28, fontWeight: 800, margin: '0 0 8px', color: '#111' }}>
                            {quest.title}
                        </h1>
                        <p style={{ fontSize: 15, color: '#555', lineHeight: 1.6, margin: 0 }}>
                            {quest.description}
                        </p>
                    </div>

                    {/* Map */}
                    {hasLocation && (
                        <div style={{ borderRadius: 14, overflow: 'hidden', border: '1px solid #e5e7eb', marginBottom: 20 }}>
                            <MapContainer center={[questLat, questLng]} zoom={15} style={{ height: 280, width: '100%' }}>
                                <TileLayer
                                    attribution='&copy; OpenStreetMap'
                                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                />
                                <Marker position={[questLat, questLng]} icon={questIcon} />
                                {quest.location?.radiusMeters && (
                                    <Circle
                                        center={[questLat, questLng]}
                                        radius={quest.location.radiusMeters}
                                        pathOptions={{ color: '#f59e0b', fillColor: '#f59e0b', fillOpacity: 0.1, weight: 2 }}
                                    />
                                )}
                            </MapContainer>
                            {quest.location?.name && (
                                <div style={{ padding: '12px 16px', background: 'white', display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <MapPin size={16} color="#f59e0b" />
                                    <span style={{ fontSize: 14, fontWeight: 500 }}>
                                        {quest.location.name}
                                        {quest.location.address ? ` — ${quest.location.address}` : ''}
                                    </span>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Stats */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 20 }}>
                        <div style={{
                            background: 'white', borderRadius: 12, padding: 16, border: '1px solid #e5e7eb', textAlign: 'center'
                        }}>
                            <div style={{ fontSize: 24, fontWeight: 800, color: '#111' }}>{quest.stats?.totalCompletions || 0}</div>
                            <div style={{ fontSize: 12, color: '#888', fontWeight: 500 }}>Completions</div>
                        </div>
                        <div style={{
                            background: 'white', borderRadius: 12, padding: 16, border: '1px solid #e5e7eb', textAlign: 'center'
                        }}>
                            <div style={{ fontSize: 24, fontWeight: 800, color: '#111' }}>{quest.stats?.totalAttempts || 0}</div>
                            <div style={{ fontSize: 12, color: '#888', fontWeight: 500 }}>Attempts</div>
                        </div>
                        <div style={{
                            background: 'white', borderRadius: 12, padding: 16, border: '1px solid #e5e7eb', textAlign: 'center'
                        }}>
                            <div style={{ fontSize: 24, fontWeight: 800, color: '#f59e0b' }}>
                                {quest.rewards?.points || 0}
                            </div>
                            <div style={{ fontSize: 12, color: '#888', fontWeight: 500 }}>Points Reward</div>
                        </div>
                    </div>

                    {/* Quest requirements info */}
                    <div style={{
                        background: 'white', borderRadius: 14, border: '1px solid #e5e7eb', padding: 20, marginBottom: 20
                    }}>
                        <h3 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 12px' }}>Quest Requirements</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                            {hasLocation && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                    <MapPin size={18} color="#3b82f6" />
                                    <span style={{ fontSize: 14 }}>Visit the location (within {quest.location?.radiusMeters || 200}m)</span>
                                </div>
                            )}
                            {quest.aiVerification?.enabled && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                    <Camera size={18} color="#8b5cf6" />
                                    <span style={{ fontSize: 14 }}>Take a photo for AI verification</span>
                                </div>
                            )}
                            {quest.qrCode?.enabled && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                    <Zap size={18} color="#f59e0b" />
                                    <span style={{ fontSize: 14 }}>Scan the QR code at the location</span>
                                </div>
                            )}
                            {quest.timeWindow?.enabled && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                    <Clock size={18} color="#ef4444" />
                                    <span style={{ fontSize: 14 }}>
                                        Visit between {quest.timeWindow.startTime} - {quest.timeWindow.endTime}
                                    </span>
                                </div>
                            )}
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <Upload size={18} color="#22c55e" />
                                <span style={{ fontSize: 14 }}>Upload a photo as proof of visit</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right - Action Panel */}
                <div style={{ position: 'sticky', top: 80 }}>
                    <div style={{
                        background: 'white', borderRadius: 16, border: '1px solid #e5e7eb',
                        padding: 24, boxShadow: '0 2px 12px rgba(0,0,0,0.06)'
                    }}>
                        {/* Rewards */}
                        <div style={{
                            background: '#fefce8', borderRadius: 12, padding: 16, marginBottom: 20, textAlign: 'center'
                        }}>
                            <Trophy size={28} color="#f59e0b" style={{ marginBottom: 8 }} />
                            <div style={{ fontSize: 24, fontWeight: 800, color: '#92400e' }}>
                                {quest.rewards?.points || 0} Points
                            </div>
                            {quest.rewards?.aptAmount > 0 && (
                                <div style={{ fontSize: 14, color: '#a16207', fontWeight: 600 }}>
                                    + {quest.rewards.aptAmount} APT
                                </div>
                            )}
                        </div>

                        {error && (
                            <div style={{
                                background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10,
                                padding: 12, marginBottom: 16, fontSize: 13, color: '#dc2626'
                            }}>
                                {error}
                            </div>
                        )}

                        {/* Step: Info */}
                        {step === 'info' && (
                            <div>
                                <button
                                    onClick={handleStartQuest}
                                    disabled={canAttempt?.canAttempt === false}
                                    style={{
                                        width: '100%', padding: '14px 24px', background: canAttempt?.canAttempt === false ? '#d1d5db' : '#111',
                                        color: 'white', border: 'none', borderRadius: 12, fontSize: 16,
                                        fontWeight: 700, cursor: canAttempt?.canAttempt === false ? 'not-allowed' : 'pointer'
                                    }}
                                >
                                    🚀 Start Quest
                                </button>
                                {canAttempt?.canAttempt === false && (
                                    <p style={{ fontSize: 12, color: '#ef4444', marginTop: 8, textAlign: 'center' }}>
                                        {canAttempt.reason}
                                    </p>
                                )}
                            </div>
                        )}

                        {/* Step: Started - Upload Photo */}
                        {step === 'started' && (
                            <div>
                                <div style={{
                                    background: '#ecfdf5', borderRadius: 10, padding: 12, marginBottom: 16,
                                    display: 'flex', alignItems: 'center', gap: 8
                                }}>
                                    <CheckCircle size={18} color="#16a34a" />
                                    <span style={{ fontSize: 13, fontWeight: 600, color: '#166534' }}>Quest started! Now visit & take a photo.</span>
                                </div>

                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/*"
                                    capture="environment"
                                    onChange={handlePhotoChange}
                                    style={{ display: 'none' }}
                                />

                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    style={{
                                        width: '100%', padding: '14px 24px', background: '#3b82f6',
                                        color: 'white', border: 'none', borderRadius: 12, fontSize: 15,
                                        fontWeight: 700, cursor: 'pointer', display: 'flex',
                                        alignItems: 'center', justifyContent: 'center', gap: 8
                                    }}
                                >
                                    <Camera size={20} /> Take / Upload Photo
                                </button>

                                <p style={{ fontSize: 12, color: '#888', marginTop: 12, textAlign: 'center' }}>
                                    📍 Make sure you're at the quest location before submitting
                                </p>
                            </div>
                        )}

                        {/* Step: Photo Review */}
                        {step === 'photo' && (
                            <div>
                                {photoPreview && (
                                    <div style={{ marginBottom: 16, borderRadius: 12, overflow: 'hidden', border: '1px solid #e5e7eb' }}>
                                        <img src={photoPreview} alt="Preview" style={{ width: '100%', height: 200, objectFit: 'cover' }} />
                                    </div>
                                )}

                                <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                                    <button
                                        onClick={() => fileInputRef.current?.click()}
                                        style={{
                                            flex: 1, padding: '10px', background: '#f3f4f6', border: '1px solid #e5e7eb',
                                            borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer'
                                        }}
                                    >
                                        Retake
                                    </button>
                                    <button
                                        onClick={handleSubmit}
                                        disabled={submitting}
                                        style={{
                                            flex: 2, padding: '10px', background: '#22c55e', color: 'white',
                                            border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 700,
                                            cursor: submitting ? 'wait' : 'pointer', display: 'flex',
                                            alignItems: 'center', justifyContent: 'center', gap: 6
                                        }}
                                    >
                                        {submitting ? (
                                            <><Loader2 className="animate-spin" size={16} /> Verifying...</>
                                        ) : (
                                            <><CheckCircle size={16} /> Submit Quest</>
                                        )}
                                    </button>
                                </div>

                                {userLocation && (
                                    <div style={{ fontSize: 12, color: '#22c55e', display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'center' }}>
                                        <Navigation size={12} /> Location attached: {userLocation.lat.toFixed(4)}, {userLocation.lng.toFixed(4)}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Step: Result */}
                        {step === 'result' && (
                            <div>
                                {submissionResult?.success ? (
                                    <div style={{ textAlign: 'center' }}>
                                        <div style={{ fontSize: 56, marginBottom: 12 }}>🎉</div>
                                        <h3 style={{ fontSize: 20, fontWeight: 800, color: '#16a34a', margin: '0 0 8px' }}>
                                            Quest Completed!
                                        </h3>
                                        <p style={{ fontSize: 14, color: '#666', marginBottom: 16 }}>
                                            {submissionResult.message}
                                        </p>

                                        {submissionResult.data?.rewards && (
                                            <div style={{
                                                background: '#fefce8', borderRadius: 12, padding: 16, marginBottom: 16
                                            }}>
                                                <h4 style={{ fontSize: 14, fontWeight: 700, color: '#92400e', margin: '0 0 8px' }}>
                                                    🏆 Rewards Earned
                                                </h4>
                                                <div style={{ display: 'flex', justifyContent: 'center', gap: 16 }}>
                                                    {submissionResult.data.rewards.points > 0 && (
                                                        <div>
                                                            <div style={{ fontSize: 20, fontWeight: 800, color: '#f59e0b' }}>
                                                                {submissionResult.data.rewards.points}
                                                            </div>
                                                            <div style={{ fontSize: 11, color: '#888' }}>Points</div>
                                                        </div>
                                                    )}
                                                    {submissionResult.data.rewards.apt > 0 && (
                                                        <div>
                                                            <div style={{ fontSize: 20, fontWeight: 800, color: '#3b82f6' }}>
                                                                {submissionResult.data.rewards.apt}
                                                            </div>
                                                            <div style={{ fontSize: 11, color: '#888' }}>APT</div>
                                                        </div>
                                                    )}
                                                    {submissionResult.data.rewards.xp > 0 && (
                                                        <div>
                                                            <div style={{ fontSize: 20, fontWeight: 800, color: '#8b5cf6' }}>
                                                                {submissionResult.data.rewards.xp}
                                                            </div>
                                                            <div style={{ fontSize: 11, color: '#888' }}>XP</div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}

                                        <button
                                            onClick={() => navigate('/quests')}
                                            style={{
                                                width: '100%', padding: '12px', background: '#111', color: 'white',
                                                border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: 'pointer'
                                            }}
                                        >
                                            Find More Quests
                                        </button>
                                    </div>
                                ) : (
                                    <div style={{ textAlign: 'center' }}>
                                        <div style={{ fontSize: 56, marginBottom: 12 }}>❌</div>
                                        <h3 style={{ fontSize: 20, fontWeight: 800, color: '#dc2626', margin: '0 0 8px' }}>
                                            Verification Failed
                                        </h3>
                                        <p style={{ fontSize: 14, color: '#666', marginBottom: 16 }}>
                                            {error || 'Try again from the correct location'}
                                        </p>

                                        {submissionResult?.data?.verification?.details && (
                                            <div style={{
                                                background: '#fef2f2', borderRadius: 10, padding: 12, marginBottom: 16,
                                                textAlign: 'left', fontSize: 12
                                            }}>
                                                {submissionResult.data.verification.details.gps && (
                                                    <div style={{ marginBottom: 4 }}>
                                                        GPS: {submissionResult.data.verification.details.gps.passed ? '✅' : '❌'}
                                                        {' '}{submissionResult.data.verification.details.gps.message}
                                                    </div>
                                                )}
                                                {submissionResult.data.verification.details.aiVision && (
                                                    <div>
                                                        AI: {submissionResult.data.verification.details.aiVision.passed ? '✅' : '❌'}
                                                        {' '}{submissionResult.data.verification.details.aiVision.message}
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        <div style={{ display: 'flex', gap: 8 }}>
                                            <button
                                                onClick={() => { setStep('started'); setError(null); setSelectedPhoto(null); setPhotoPreview(null); }}
                                                style={{
                                                    flex: 1, padding: '12px', background: '#3b82f6', color: 'white',
                                                    border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: 'pointer'
                                                }}
                                            >
                                                Try Again
                                            </button>
                                            <button
                                                onClick={() => navigate('/quests')}
                                                style={{
                                                    flex: 1, padding: '12px', background: '#f3f4f6', border: '1px solid #e5e7eb',
                                                    borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: 'pointer'
                                                }}
                                            >
                                                Back to Map
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
};

export default QuestDetail;
