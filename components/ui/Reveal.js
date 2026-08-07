"use client";

import { motion, useReducedMotion } from "framer-motion";

export default function Reveal({
  children,
  as: Component = "div",
  delay = 0,
  y = 24,
  blur = true,
  once = true,
  className,
}) {
  const reduced = useReducedMotion();
  const MotionComponent = motion[Component] ?? motion.div;

  if (reduced) {
    return <Component className={className}>{children}</Component>;
  }

  return (
    <MotionComponent
      className={className}
      initial={{ opacity: 0, y, filter: blur ? "blur(6px)" : "blur(0px)" }}
      whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      viewport={{ once, margin: "-80px" }}
      transition={{ type: "spring", stiffness: 260, damping: 30, delay }}
    >
      {children}
    </MotionComponent>
  );
}
