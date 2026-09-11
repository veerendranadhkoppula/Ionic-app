import React, { useRef, useState } from "react";
import styles from "./FaqSection.module.css";
import type { CoffeeExperience } from "../../../api/apiCoffeeExperience";

interface FaqSectionProps {
  experience: CoffeeExperience;
}

// Same accordion pattern/behavior as the Help & Support screen (Help.tsx) —
// ref-measured scrollHeight driving the open/close height animation — just
// with this section's own supplied chevron icon instead of Help's.
const FaqSection: React.FC<FaqSectionProps> = ({ experience }) => {
  const faqs = experience.faqs;
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const bodyRefs = useRef<(HTMLDivElement | null)[]>([]);

  if (faqs.length === 0) return null;

  const toggleFaq = (index: number) => {
    setOpenIndex((prev) => (prev === index ? null : index));
  };

  return (
    <div className={styles.main}>
      <p className={styles.Heading}>How can we help you?</p>

      <div className={styles.Faqs}>
        {faqs.map((faq, i) => {
          const isOpen = openIndex === i;
          const bodyEl = bodyRefs.current[i];
          const height = isOpen && bodyEl ? bodyEl.scrollHeight : 0;

          return (
            <div key={i} className={styles.FaqRow} onClick={() => toggleFaq(i)}>
              <div className={styles.FaqHeader}>
                <span>{faq.question}</span>
                <svg
                  className={`${styles.Arrow} ${isOpen ? styles.Rotate : ""}`}
                  width="20"
                  height="20"
                  viewBox="0 0 35 35"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M13 14.5L18.5 20L24 14.5"
                    stroke="#4B3827"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>

              <div className={styles.FaqBody} style={{ height }}>
                <div
                  ref={(el) => {
                    bodyRefs.current[i] = el;
                  }}
                  className={styles.FaqInner}
                >
                  <p>{faq.answer}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default FaqSection;
