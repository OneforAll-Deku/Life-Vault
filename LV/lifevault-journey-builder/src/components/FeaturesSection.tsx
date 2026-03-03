import { motion, useMotionValue, useMotionTemplate } from "framer-motion";
import {
  Calendar,
  CloudUpload,
  Share2,
  ShieldCheck,
  Users,
  Heart,
  ArrowUpRight,
  ChevronRight,
  Target,
  Zap,
  Lock,
  Globe,
  Database,
  Fingerprint
} from "lucide-react";
import { MouseEvent, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

const features = [
  {
    icon: Calendar,
    title: "Visual Life Timeline",
    description: "See your memories organized beautifully by year and life chapters",
    longDescription: "Our AI automatically clusters your photos and documents into chronological 'Life Chapters'. Experience your history as a curated narrative, not just a folder of files. Scroll through decades of your life with a smooth, interactive interface that highlights major milestones.",
    color: "from-blue-500/20 to-indigo-500/20",
    accent: "text-blue-400",
    stats: { tech: "Chronos AI", security: "AES-256" }
  },
  {
    icon: CloudUpload,
    title: "Simple Memory Upload",
    description: "Drag, drop, and preserve. Add photos, documents, certificates in seconds",
    longDescription: "Uploading is as simple as a gesture. Once uploaded, our system extracts metadata, transcribes handwritten notes, and optimizes large media for permanent storage. Integration with IPFS ensures your assets are distributed and immortal.",
    color: "from-emerald-500/20 to-teal-500/20",
    accent: "text-emerald-400",
    stats: { tech: "IPFS / Filecoin", security: "Immutable" }
  },
  {
    icon: Share2,
    title: "Consent-Based Sharing",
    description: "Share with loved ones with full control over access and duration",
    longDescription: "You are the sole authority. Grant 'Guardian' access to family or 'Guest' access to friends. Every shared link is encrypted with recipient-specific keys and can be revoked instantly from your central dashboard.",
    color: "from-purple-500/20 to-pink-500/20",
    accent: "text-purple-400",
    stats: { tech: "ZK-Permissions", security: "End-to-End" }
  },
  {
    icon: ShieldCheck,
    title: "Complete Privacy",
    description: "Your data stays yours. Toggle privacy settings with one tap",
    longDescription: "Built on a Zero-Knowledge proof system. Your vault keys are generated locally and never leave your device. We provide the infrastructure, but you provide the absolute lock. Not even our administrators can view your memories.",
    color: "from-amber-500/20 to-orange-500/20",
    accent: "text-amber-400",
    stats: { tech: "Zero-Knowledge", security: "Local Keys" }
  },
  {
    icon: Users,
    title: "Social Recovery",
    description: "Designate trusted people to help recover access if needed",
    longDescription: "Blockchain security usually means 'lose your key, lose your data'. Not here. Set up a 'Guardian Circle'. If your keys are lost, a consensus of your trusted peers can help re-issue your access in a secure, decentralized manner.",
    color: "from-cyan-500/20 to-blue-500/20",
    accent: "text-cyan-400",
    stats: { tech: "Shamir's Secret", security: "Multi-Sig" }
  },
  {
    icon: Heart,
    title: "Digital Legacy",
    description: "Plan what happens to your memories for future generations",
    longDescription: "Your legacy is too precious to be lost. Configure an 'Inheritance Trigger' that automatically unlocks specific chapters for your designated heirs after a period of inactivity, ensuring your story lives on forever.",
    color: "from-red-500/20 to-rose-500/20",
    accent: "text-red-400",
    stats: { tech: "Smart Contracts", security: "Legacy protocol" }
  },
];

function FeatureCard({ feature, index }: { feature: typeof features[0]; index: number }) {
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const [isOpen, setIsOpen] = useState(false);

  function handleMouseMove({ currentTarget, clientX, clientY }: MouseEvent) {
    const { left, top } = currentTarget.getBoundingClientRect();
    mouseX.set(clientX - left);
    mouseY.set(clientY - top);
  }

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ delay: index * 0.1, duration: 0.5 }}
        whileHover={{ y: -5 }}
        onMouseMove={handleMouseMove}
        onClick={() => setIsOpen(true)}
        className="group relative rounded-[32px] border border-white/5 bg-zinc-900/40 p-8 backdrop-blur-md transition-all hover:border-white/20 hover:bg-zinc-900/60 overflow-hidden cursor-pointer h-full flex flex-col"
      >
        {/* Spotlight Effect */}
        <motion.div
          className="pointer-events-none absolute -inset-px rounded-[32px] opacity-0 transition duration-300 group-hover:opacity-100"
          style={{
            background: useMotionTemplate`
              radial-gradient(
                600px circle at ${mouseX}px ${mouseY}px,
                rgba(255, 255, 255, 0.08),
                transparent 80%
              )
            `,
          }}
        />

        {/* Accent Glow */}
        <div className={`absolute -right-8 -top-8 w-32 h-32 bg-gradient-to-br ${feature.color} blur-[60px] opacity-0 transition-opacity duration-500 group-hover:opacity-100`} />

        <div className="relative z-10 flex flex-col h-full">
          <div className="mb-8 flex items-center justify-between">
            <div className={`flex h-16 w-16 items-center justify-center rounded-2xl border border-white/10 bg-white/5 shadow-2xl transition-all duration-500 group-hover:scale-110 group-hover:bg-white/10 group-hover:border-white/30 ${feature.accent}`}>
              <feature.icon className="h-8 w-8" />
              <div className="absolute inset-0 -z-10 rounded-2xl bg-white/5 opacity-0 blur-xl transition-opacity group-hover:opacity-40" />
            </div>

            <motion.div
              whileHover={{ rotate: 45 }}
              className="p-2 rounded-full border border-white/5 bg-white/5 opacity-40 group-hover:opacity-100 transition-opacity"
            >
              <ArrowUpRight className="w-5 h-5 text-white" />
            </motion.div>
          </div>

          <h3 className="mb-4 text-2xl font-bold tracking-tight text-white font-display group-hover:text-white transition-colors">
            {feature.title}
          </h3>
          <p className="mb-8 text-white/40 leading-relaxed font-light text-base group-hover:text-white/70 transition-colors">
            {feature.description}
          </p>

          <div className="mt-auto pt-6 flex items-center gap-3 text-[11px] font-black tracking-widest text-white/20 uppercase group-hover:text-white/80 transition-all duration-300">
            <span className="w-10 h-[1.5px] bg-white/10 group-hover:bg-white/40 transition-colors" />
            Learn Details
            <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-1.5" />
          </div>
        </div>
      </motion.div>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-2xl bg-[#09090b]/95 border-white/10 backdrop-blur-3xl text-white overflow-hidden p-0 rounded-[40px]">
          {/* Animated Background Decor */}
          <div className={`absolute inset-0 bg-gradient-to-br ${feature.color} opacity-20 blur-[120px] pointer-events-none`} />
          <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent" />

          <div className="p-12 relative z-10">
            <DialogHeader className="mb-12">
              <div className={`mb-8 inline-flex h-24 w-24 items-center justify-center rounded-[32px] border border-white/10 bg-white/5 ${feature.accent}`}>
                <feature.icon className="h-12 w-12 text-current" />
              </div>
              <DialogTitle className="text-5xl md:text-6xl font-black tracking-tighter text-white font-display mb-6">
                {feature.title}
              </DialogTitle>
              <DialogDescription className="text-white/50 text-xl leading-relaxed font-light">
                {feature.longDescription}
              </DialogDescription>
            </DialogHeader>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="group/item p-8 rounded-[32px] border border-white/5 bg-white/[0.02] hover:bg-white/[0.05] transition-colors">
                <div className="flex items-center gap-3 mb-3">
                  <Zap className="w-5 h-5 text-emerald-400" />
                  <h4 className="text-xs font-bold tracking-widest text-white/40 uppercase">Architecture</h4>
                </div>
                <p className="text-xl font-medium text-white/90">{feature.stats.tech}</p>
              </div>
              <div className="group/item p-8 rounded-[32px] border border-white/5 bg-white/[0.02] hover:bg-white/[0.05] transition-colors">
                <div className="flex items-center gap-3 mb-3">
                  <Fingerprint className="w-5 h-5 text-blue-400" />
                  <h4 className="text-xs font-bold tracking-widest text-white/40 uppercase">Validation</h4>
                </div>
                <p className="text-xl font-medium text-white/90">{feature.stats.security}</p>
              </div>
            </div>

            <div className="mt-14 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex -space-x-4">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="w-10 h-10 rounded-full border-4 border-[#09090b] bg-zinc-800" />
                  ))}
                </div>
                <div className="text-xs text-white/40 font-medium tracking-tight">Trusted by <span className="text-white font-bold">12,482</span> legacy builders</div>
              </div>

              <button
                onClick={() => setIsOpen(false)}
                className="group/btn relative px-10 py-5 rounded-full bg-white text-black font-black text-sm overflow-hidden transition-all hover:scale-105 active:scale-95 shadow-[0_0_20px_rgba(255,255,255,0.2)]"
              >
                <span className="relative z-10 transition-colors group-hover/btn:text-white">Close Exploration</span>
                <div className="absolute inset-0 bg-black translate-y-full group-hover/btn:translate-y-0 transition-transform duration-500 ease-out" />
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function FeaturesSection() {
  return (
    <section id="features" className="relative py-32 lg:py-48 bg-transparent overflow-hidden">
      {/* Dynamic Grid Background Overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:60px_60px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]" />

      {/* Decorative Orbs */}
      <div className="absolute top-1/2 left-0 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[1000px] bg-indigo-500/10 rounded-full blur-[160px] pointer-events-none animate-pulse" />
      <div className="absolute bottom-0 right-0 translate-x-1/3 w-[800px] h-[800px] bg-purple-500/10 rounded-full blur-[140px] pointer-events-none" />

      <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-20">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center max-w-4xl mx-auto mb-32"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            whileInView={{ opacity: 1, scale: 1 }}
            className="mb-10 inline-flex items-center gap-3 px-4 py-2 rounded-full border border-white/10 bg-white/5 backdrop-blur-md"
          >
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_10px_rgba(52,211,153,0.5)]" />
            <span className="text-[11px] font-black tracking-[0.3em] text-white/80 uppercase">
              Core Protocol v2.0
            </span>
          </motion.div>

          <h2 className="text-6xl md:text-8xl font-black text-white tracking-tighter leading-[1.05] mb-10">
            Engineered for <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-white/80 to-white/20 italic">Human Eternity</span>
          </h2>

          <p className="text-2xl md:text-3xl text-white/40 font-light max-w-3xl mx-auto leading-relaxed">
            We've combined distributed ledger technology with intuitive design to ensure your history remains accessible, secure, and immutable forever.
          </p>
        </motion.div>

        {/* Feature Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-10">
          {features.map((feature, i) => (
            <FeatureCard key={feature.title} feature={feature} index={i} />
          ))}
        </div>

        {/* Bottom Specs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mt-32 text-center"
        >
          <div className="inline-flex flex-wrap justify-center items-center gap-x-12 gap-y-6 px-12 py-8 rounded-[40px] border border-white/5 bg-white/[0.01] backdrop-blur-xl">
            <div className="flex items-center gap-4 group cursor-default">
              <div className="w-10 h-10 rounded-2xl bg-white/5 flex items-center justify-center border border-white/10 group-hover:bg-white/10 transition-colors">
                <Lock className="w-5 h-5 text-white/40 group-hover:text-white transition-colors" />
              </div>
              <div className="text-left">
                <div className="text-[10px] font-bold text-white/20 uppercase tracking-widest">Security</div>
                <div className="text-sm font-bold text-white/60">Zero-Knowledge Base</div>
              </div>
            </div>
            <div className="hidden md:block w-[1px] h-10 bg-white/10" />
            <div className="flex items-center gap-4 group cursor-default">
              <div className="w-10 h-10 rounded-2xl bg-white/5 flex items-center justify-center border border-white/10 group-hover:bg-white/10 transition-colors">
                <Globe className="w-5 h-5 text-white/40 group-hover:text-white transition-colors" />
              </div>
              <div className="text-left">
                <div className="text-[10px] font-bold text-white/20 uppercase tracking-widest">Network</div>
                <div className="text-sm font-bold text-white/60">Global IPFS Nodes</div>
              </div>
            </div>
            <div className="hidden md:block w-[1px] h-10 bg-white/10" />
            <div className="flex items-center gap-4 group cursor-default">
              <div className="w-10 h-10 rounded-2xl bg-white/5 flex items-center justify-center border border-white/10 group-hover:bg-white/10 transition-colors">
                <Database className="w-5 h-5 text-white/40 group-hover:text-white transition-colors" />
              </div>
              <div className="text-left">
                <div className="text-[10px] font-bold text-white/20 uppercase tracking-widest">Settlement</div>
                <div className="text-sm font-bold text-white/60">Aptos Mainnet</div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
