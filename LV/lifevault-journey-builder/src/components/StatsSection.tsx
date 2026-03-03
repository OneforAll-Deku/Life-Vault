import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { platformStatsAPI } from "@/services/api";

// Fallback stats used while loading or if the API is unavailable
const fallbackStats = [
  { key: "activeUsers", value: "10K+", label: "Active Users" },
  { key: "memoriesStored", value: "50K+", label: "Memories Stored" },
  { key: "userOwnership", value: "100%", label: "User Ownership" },
  { key: "encryption", value: "256-bit", label: "Encryption" },
];

export function StatsSection() {
  const [stats, setStats] = useState(fallbackStats);

  useEffect(() => {
    let cancelled = false;

    const fetchStats = async () => {
      try {
        const { data } = await platformStatsAPI.getStats();
        if (cancelled || !data?.data?.formatted) return;

        const f = data.data.formatted;
        setStats([
          { key: "activeUsers", value: f.activeUsers, label: "Active Users" },
          { key: "memoriesStored", value: f.memoriesStored, label: "Memories Stored" },
          { key: "userOwnership", value: f.userOwnership, label: "User Ownership" },
          { key: "encryption", value: f.encryption, label: "Encryption" },
        ]);
      } catch {
        // Silently keep fallback values
      }
    };

    fetchStats();
    return () => { cancelled = true; };
  }, []);

  return (
    <section className="relative py-24 bg-transparent text-white">
      <div className="max-w-7xl mx-auto px-5 lg:px-20">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 lg:gap-8">
          {stats.map((stat, i) => (
            <motion.div
              key={stat.key}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: i * 0.1 }}
              className="group relative p-8 rounded-[2.5rem] text-center transition-all duration-500 overflow-hidden"
              style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.08)',
                backdropFilter: 'blur(12px)',
              }}
              onMouseMove={(e) => {
                const { currentTarget, clientX, clientY } = e;
                const { left, top } = currentTarget.getBoundingClientRect();
                const x = clientX - left;
                const y = clientY - top;
                currentTarget.style.setProperty('--x', `${x}px`);
                currentTarget.style.setProperty('--y', `${y}px`);
              }}
            >
              {/* Spotlight Effect */}
              <div
                className="pointer-events-none absolute -inset-px opacity-0 group-hover:opacity-100 transition duration-500"
                style={{
                  background: `radial-gradient(300px circle at var(--x) var(--y), rgba(255,255,255,0.1), transparent 80%)`,
                }}
              />

              <div className="relative z-10">
                <p className="text-5xl md:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-white/40 mb-3 tracking-tighter">
                  {stat.value}
                </p>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/50">{stat.label}</p>
              </div>

              {/* Decorative flourish */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-12 h-[2px] bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
