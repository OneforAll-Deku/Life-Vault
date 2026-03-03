import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, Vault, Link } from "lucide-react";

const navLinks = [
  { href: "#about", label: "About" },
  { href: "#features", label: "Features" },
  { href: "#why", label: "Why Block Pix?" },
  { href: "#upload", label: "Upload" },
  { href: "#security", label: "Security" },
  { href: "#contact", label: "Contact" },
];

export function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <>
      <motion.nav
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.5 }}
        className={`fixed top-0 left-0 right-0 z-50 h-[80px] transition-all duration-300 ${isScrolled ? "glass-navbar shadow-sm" : "bg-transparent"
          }`}
      >
        <div className="h-full max-w-7xl mx-auto px-6 lg:px-24 flex items-center justify-between">

          {/* Logo */}
          <a href="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-black flex items-center justify-center shadow-lg transition-transform group-hover:scale-105">
              <Vault className="w-6 h-6 text-white" />
            </div>

            <span className="text-2xl font-bold text-white tracking-tight">Block Pix</span>

          </a>


          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center gap-10">
            {navLinks.map((link) => (
              <a key={link.href} href={link.href} className="nav-link text-[16px]">
                {link.label}
              </a>
            ))}
          </div>

          {/* Desktop CTAs */}
          <div className="hidden lg:flex items-center gap-4">

            <a href="/login" className="nav-link px-2">
              Login
            </a>
            <a href="/register" className="btn-gradient px-8 !py-3">
              Get Started
            </a>
            {/* <button className="btn-gradient text-sm !px-6 !py-3">
              Sign Up
            </button> */}
          </div>

          {/* Mobile Menu Button */}
          <button
            className="lg:hidden p-2 text-white"
            onClick={() => setIsMobileMenuOpen(true)}
          >
            <Menu className="w-6 h-6" />
          </button>
        </div>
      </motion.nav>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 lg:hidden"
              onClick={() => setIsMobileMenuOpen(false)}
            />
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed top-0 right-0 h-full w-[300px] bg-zinc-950 border-l border-white/10 z-50 lg:hidden shadow-2xl"
            >
              <div className="p-6">
                <button
                  className="absolute top-6 right-6 text-white"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <X className="w-6 h-6" />
                </button>

                <div className="mt-16 flex flex-col gap-6">
                  {navLinks.map((link) => (
                    <a
                      key={link.href}
                      href={link.href}
                      className="text-lg font-medium text-white/50 hover:text-white transition-colors"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      {link.label}
                    </a>
                  ))}

                  <div className="pt-6 border-t border-white/10 flex flex-col gap-4">

                    <a href="/login" className="nav-link w-full text-center">
                      <button className="btn-gradient w-full !py-3">
                        Sign Up
                      </button>
                    </a>

                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
