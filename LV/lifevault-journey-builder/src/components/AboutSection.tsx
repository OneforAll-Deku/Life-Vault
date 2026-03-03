import { motion } from "framer-motion";
import { Check } from "lucide-react";
import TextAnimation from "@/components/ui/scroll-text";

const benefits = [
  "Own your memories forever",
  "Share with consent-based controls",
  "Protect your digital legacy",
  "Access from any device",
];

export function AboutSection() {
  return (
    <section id="about" className="relative py-20 lg:py-32 overflow-hidden bg-transparent">
      <div className="max-w-4xl mx-auto px-5 lg:px-20 text-center flex flex-col items-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="flex flex-col items-center"
        >
          <span className="section-label">ABOUT BLOCK PIX</span>
          <TextAnimation
            as="h2"
            text="A New Way to Preserve What Matters Most"
            classname="section-heading mt-4"
            letterAnime={true}
          />
          <p className="mt-8 text-lg md:text-xl text-white/70 leading-relaxed font-light">
            Block Pix is your personal digital sanctuary—a secure space where your most precious memories, documents, and life milestones live forever. Unlike traditional cloud storage, you maintain complete ownership and control over everything you store.
          </p>

          <div className="mt-12 flex flex-wrap justify-center gap-4">
            {benefits.map((benefit, i) => (
              <motion.div
                key={benefit}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.2 + (i * 0.1) }}
                className="flex items-center gap-3 px-5 py-3 rounded-full bg-white/5 backdrop-blur-md border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all duration-300"
              >
                <div className="w-6 h-6 rounded-full bg-white/10 text-white flex items-center justify-center shadow-sm shrink-0">
                  <Check className="w-3.5 h-3.5" />
                </div>
                <span className="text-sm font-medium text-white/90">{benefit}</span>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
