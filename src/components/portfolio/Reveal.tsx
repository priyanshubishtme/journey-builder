import { motion } from "framer-motion";
import type { ReactNode } from "react";

/**
 * Fade-and-rise once, the first time a block scrolls into view. Used for
 * section intros so the page settles into place instead of filling the screen
 * all at once. Skips the motion entirely when the visitor asks for less of it.
 */
export function Reveal({
  children,
  className,
  delay = 0,
  y = 20,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  y?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-70px" }}
      transition={{ duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
