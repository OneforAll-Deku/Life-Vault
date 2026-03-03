import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";

const comparisons = [
  {
    problem: "Scattered Memories",
    problemDesc: "Your photos, documents, and videos exist across numerous platforms and hard drives, vulnerable to being lost or forgotten over time.",
    solution: "Unified Vault",
    solutionDesc: "Block Pix brings everything into one exquisitely organized personal sanctuary that you fully control and own forever.",
  },
  {
    problem: "Temporary Access",
    problemDesc: "Relying on big tech means your legacy is subject to policy changes, account deletions, or sudden platform shutdowns.",
    solution: "Permanent Legacy",
    solutionDesc: "Your Block Pix is a secure, persistent record designed to outlast platforms. What you preserve here is truly permanent.",
  },
  {
    problem: "Loss of Privacy",
    problemDesc: "Sharing intimate memories on social networks means giving up your privacy and losing control of your personal data.",
    solution: "Absolute Security",
    solutionDesc: "Share only what you want, with whom you want, utilizing end-to-end encryption, time limits, and instantly revocable access.",
  },
];

export function WhySection() {
  return (
    <section id="why" className="relative py-24 lg:py-40 bg-transparent flex flex-col items-center justify-center">
      <div className="relative max-w-5xl mx-auto px-5 lg:px-12 text-center">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="mb-20 flex flex-col items-center"
        >
          {/* Animated badge */}

          <motion.div
            className="inline-flex items-center gap-2 bg-white/5 border border-white/10 px-5 py-2 rounded-full mb-8 backdrop-blur-md"
            whileHover={{ scale: 1.05 }}
          >
            <span className="text-sm font-semibold tracking-widest text-white/90 uppercase">
              The Alternative
            </span>
          </motion.div>


          <motion.h2
            className="text-4xl md:text-5xl lg:text-6xl font-black tracking-tight text-white mb-6 drop-shadow-sm leading-tight"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
          >
            A Standard Beyond <br className="hidden md:block" /> Ordinary Cloud Storage
          </motion.h2>

          <motion.p
            className="text-xl md:text-2xl text-white/60 font-light max-w-3xl"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.4 }}
          >
            Memories are irreplaceable. We built a platform worthy of preserving them with uncompromising security, privacy, and permanence.
          </motion.p>
        </motion.div>

        {/* Comparison List */}
        <div className="flex flex-col gap-10 w-full mt-12">
          {comparisons.map((item, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.7, delay: i * 0.1 }}
              className="relative group w-full grid md:grid-cols-2 gap-0 border border-white/10 rounded-[2.5rem] overflow-hidden backdrop-blur-md transition-all duration-700 hover:border-white/20 hover:shadow-2xl hover:shadow-black/60"
              style={{
                background: 'rgba(255,255,255,0.02)',
              }}
            >
              <div className="p-10 md:p-14 border-b md:border-b-0 md:border-r border-white/10 text-left flex flex-col justify-center transition-all duration-700 group-hover:bg-red-500/[0.02]">
                <span className="text-[10px] font-black text-red-400/80 uppercase tracking-[0.3em] mb-4">The Problem</span>
                <h3 className="text-2xl md:text-3xl font-black text-white/90 mb-5 tracking-tight group-hover:text-white transition-colors">{item.problem}</h3>
                <p className="text-lg text-white/40 leading-relaxed font-light group-hover:text-white/50 transition-colors">{item.problemDesc}</p>
              </div>

              <div className="p-10 md:p-14 text-left flex flex-col justify-center relative transition-all duration-700 group-hover:bg-emerald-500/[0.03]">
                <div className="absolute top-1/2 -left-6 md:-left-8 -translate-y-1/2 w-12 h-12 md:w-16 md:h-16 rounded-full bg-[#09090b] border border-white/10 flex items-center justify-center shadow-2xl rotate-90 md:rotate-0 z-20 group-hover:border-white/30 transition-all duration-700">
                  <ArrowRight className="w-5 h-5 text-white/40 group-hover:text-white transition-colors" />
                </div>
                <span className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.3em] mb-4">The Life Vault Solution</span>
                <h3 className="text-2xl md:text-3xl font-black text-white mb-5 tracking-tight group-hover:scale-[1.02] origin-left transition-transform duration-700">{item.solution}</h3>
                <p className="text-lg text-white/70 leading-relaxed font-light group-hover:text-white/90 transition-colors">{item.solutionDesc}</p>

                {/* Subtle highlight glow */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 blur-[60px] opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}