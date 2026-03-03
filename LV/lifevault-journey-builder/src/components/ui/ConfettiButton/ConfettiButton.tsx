import React, { useEffect, useState, useRef, useCallback } from "react";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";
import { cva, type VariantProps } from "class-variance-authority";

/* ─── Confetti type ────────────────────────────────────────── */
type ConfettiOptions = {
    particleCount?: number;
    spread?: number;
    startVelocity?: number;
    decay?: number;
    gravity?: number;
    drift?: number;
    ticks?: number;
    origin?: { x?: number; y?: number };
    colors?: string[];
    shapes?: string[];
    scalar?: number;
    zIndex?: number;
    disableForReducedMotion?: boolean;
};

declare global {
    interface Window {
        confetti?: (options?: ConfettiOptions) => void;
    }
}

/* ─── Variants ─────────────────────────────────────────────── */
const confettiButtonVariants = cva(
    "inline-flex items-center justify-center gap-2 font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none",
    {
        variants: {
            variant: {
                default:
                    "bg-indigo-600 text-white hover:bg-indigo-700 shadow-xl shadow-indigo-200",
                secondary:
                    "bg-gray-100 text-gray-900 hover:bg-gray-200",
                outline:
                    "border border-gray-200 bg-white hover:bg-gray-50 hover:text-gray-900",
                ghost:
                    "hover:bg-gray-100 hover:text-gray-900",
                link:
                    "text-indigo-600 underline-offset-4 hover:underline",
                gradient:
                    "bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 text-white hover:from-indigo-700 hover:via-purple-700 hover:to-pink-600 shadow-xl shadow-purple-200",
            },
            size: {
                default: "h-10 px-4 py-2 rounded-xl",
                sm: "h-8 px-3 py-1 rounded-lg text-sm",
                lg: "h-12 px-6 py-3 rounded-xl text-lg",
                xl: "h-14 px-8 py-4 rounded-2xl text-xl",
                icon: "h-10 w-10 rounded-full",
                pill: "h-10 px-6 py-2 rounded-full",
            },
            animation: {
                none: "",
                pulse: "animate-pulse",
                bounce: "hover:animate-bounce",
                scale: "active:scale-95",
                glow: "hover:shadow-[0_0_20px_rgba(99,102,241,0.4)]",
                expand: "active:scale-110 transition-transform",
            },
        },
        defaultVariants: {
            variant: "default",
            size: "default",
            animation: "scale",
        },
    }
);

/* ─── Props ────────────────────────────────────────────────── */
export interface ConfettiButtonProps
    extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof confettiButtonVariants> {
    icon?: React.ReactNode;
    iconPosition?: "left" | "right";
    loading?: boolean;
    confettiOptions?: ConfettiOptions;
    autoConfetti?: boolean;
    triggerOnHover?: boolean;
}

/* ─── Component ────────────────────────────────────────────── */
const ConfettiButton = React.forwardRef<HTMLButtonElement, ConfettiButtonProps>(
    (
        {
            className,
            variant,
            size,
            animation,
            children,
            icon,
            iconPosition = "left",
            loading = false,
            confettiOptions = {
                particleCount: 100,
                spread: 70,
            },
            autoConfetti = false,
            triggerOnHover = false,
            ...props
        },
        ref
    ) => {
        const [scriptLoaded, setScriptLoaded] = useState(false);
        const buttonRef = useRef<HTMLButtonElement | null>(null);

        /* Load canvas-confetti CDN */
        useEffect(() => {
            if (window.confetti) {
                setScriptLoaded(true);
                return;
            }
            const script = document.createElement("script");
            script.src =
                "https://cdn.jsdelivr.net/npm/canvas-confetti@1.4.0/dist/confetti.browser.min.js";
            script.async = true;
            script.onload = () => setScriptLoaded(true);
            document.body.appendChild(script);
            return () => {
                if (script.parentNode) script.parentNode.removeChild(script);
            };
        }, []);

        /* Auto-fire on mount */
        useEffect(() => {
            if (scriptLoaded && autoConfetti && window.confetti && buttonRef.current) {
                const rect = buttonRef.current.getBoundingClientRect();
                window.confetti({
                    ...confettiOptions,
                    origin: {
                        x: (rect.left + rect.width / 2) / window.innerWidth,
                        y: (rect.top + rect.height / 2) / window.innerHeight,
                    },
                });
            }
        }, [scriptLoaded, autoConfetti, confettiOptions]);

        const triggerConfetti = useCallback(() => {
            if (!scriptLoaded || !window.confetti || !buttonRef.current) return;
            const rect = buttonRef.current.getBoundingClientRect();
            window.confetti({
                ...confettiOptions,
                origin: {
                    x: (rect.left + rect.width / 2) / window.innerWidth,
                    y: (rect.top + rect.height / 2) / window.innerHeight,
                },
            });
        }, [scriptLoaded, confettiOptions]);

        return (
            <button
                ref={(node) => {
                    if (typeof ref === "function") ref(node);
                    else if (ref) (ref as React.MutableRefObject<HTMLButtonElement | null>).current = node;
                    buttonRef.current = node;
                }}
                className={cn(
                    confettiButtonVariants({ variant, size, animation }),
                    className
                )}
                onClick={(e) => {
                    triggerConfetti();
                    props.onClick?.(e);
                }}
                onMouseEnter={triggerOnHover ? triggerConfetti : undefined}
                disabled={loading || props.disabled}
                {...props}
            >
                {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {!loading && icon && iconPosition === "left" && (
                    <span className="mr-1">{icon}</span>
                )}
                {children}
                {!loading && icon && iconPosition === "right" && (
                    <span className="ml-1">{icon}</span>
                )}
            </button>
        );
    }
);

ConfettiButton.displayName = "ConfettiButton";

/* ─── Standalone trigger (for programmatic use) ────────────── */
export function fireConfetti(options?: ConfettiOptions) {
    if (window.confetti) {
        window.confetti({
            particleCount: 150,
            spread: 100,
            startVelocity: 30,
            gravity: 0.8,
            ticks: 100,
            colors: [
                "#6366f1", "#8b5cf6", "#a855f7",
                "#ec4899", "#f43f5e", "#f97316",
                "#eab308", "#22c55e", "#06b6d4",
            ],
            ...options,
        });
    }
}

export { ConfettiButton, confettiButtonVariants };
