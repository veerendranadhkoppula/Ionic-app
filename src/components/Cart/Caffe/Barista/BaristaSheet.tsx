import React, { useState } from "react";
import styles from "./BaristaSheet.module.css";
import baristaimage from "./b.png";
import { useBaristaList } from "./useBaristaList";
import type { Barista } from "../../../../api/apiCafe";
import { useHistory } from "react-router-dom";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (barista: {
    id: number;
    name: string;
    shortDesc: string;
  }) => void;
  currentBaristaId?: number | null;
  onClear?: () => void;
}

const BaristaSheet: React.FC<Props> = ({ isOpen, onClose, onConfirm, currentBaristaId, onClear }) => {
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const { baristas, loading, error, retry } = useBaristaList();
  const history = useHistory();

  // Sync internal selection with parent's current barista whenever sheet opens
  React.useEffect(() => {
    if (isOpen) {
      setSelectedId(currentBaristaId ?? null);
    }
  }, [isOpen, currentBaristaId]);

  const handleSelect = (id: number) => setSelectedId(prev => prev === id ? null : id);

  const handleExpand = (id: number) =>
    setExpandedId(expandedId === id ? null : id);

  const handleClear = () => {
    setSelectedId(null);
    onClear?.();
  };

  return (
    <>
      <div
        className={`${styles.overlay} ${isOpen ? styles.overlayVisible : ""}`}
        onClick={onClose}
      >
        <div
          className={`${styles.sheet} ${isOpen ? styles.sheetOpen : ""}`}
          onClick={(e) => e.stopPropagation()}
        >
          <div className={styles.main}>
            <div className={styles.MainContainer}>
              <div className={styles.Top}>
                <div className={styles.TopTop}>
                  <div className={styles.TopTopLeft}>
                    <h4>Choose your Barista</h4>
                    <p>Pick the barista you&apos;d like today</p>
                  </div>
                  <div className={styles.TopTopRight} onClick={onClose}>
                    <svg
                      width="35"
                      height="35"
                      viewBox="0 0 35 35"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M24.1664 10.143C24.3571 9.95232 24.6662 9.95232 24.857 10.143C25.0477 10.3338 25.0477 10.6429 24.857 10.8336L18.6906 17L24.857 23.1664C25.0477 23.3571 25.0477 23.6662 24.857 23.857C24.6662 24.0477 24.3571 24.0477 24.1664 23.857L18 17.6906L11.8336 23.857C11.6429 24.0477 11.3338 24.0477 11.143 23.857C10.9523 23.6662 10.9523 23.3571 11.143 23.1664L17.3094 17L11.143 10.8336C10.9523 10.6429 10.9523 10.3338 11.143 10.143C11.3338 9.95232 11.6429 9.95232 11.8336 10.143L18 16.3094L24.1664 10.143Z"
                        fill="#4B3827"
                      />
                    </svg>
                  </div>
                </div>

                <div className={styles.TopBottom}>
                  <p onClick={handleClear}>Clear</p>
                </div>
              </div>

              <div className={styles.Bottom}>
                {/* Loading state */}
                {loading && (
                  <div style={{ textAlign: "center", padding: "24px 0", color: "#6C7A5F" }}>
                    Loading baristas...
                  </div>
                )}

                {/* Error state */}
                {!loading && error && (
                  <div style={{ textAlign: "center", padding: "24px 16px" }}>
                    {error === "AUTH_REQUIRED" ? (
                      <>
                        <p style={{ color: "#A83434", marginBottom: 12 }}>
                          Please log in or sign up to see the barista's list.
                        </p>
                        <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
                          <button
                            onClick={() => history.push("/auth")}
                            style={{
                              background: "#6C7A5F",
                              color: "#fff",
                              border: "none",
                              borderRadius: 8,
                              padding: "8px 20px",
                              cursor: "pointer",
                              fontSize: 14,
                            }}
                          >
                            Log in / Sign up
                          </button>
                        </div>
                      </>
                    ) : (
                      <>
                        <p style={{ color: "#A83434", marginBottom: 12 }}>
                          {error}
                        </p>
                        <button
                          onClick={retry}
                          style={{
                            background: "#6C7A5F",
                            color: "#fff",
                            border: "none",
                            borderRadius: 8,
                            padding: "8px 20px",
                            cursor: "pointer",
                            fontSize: 14,
                          }}
                        >
                          Retry
                        </button>
                      </>
                    )}
                  </div>
                )}

                {/* Empty state */}
                {!loading && !error && baristas.length === 0 && (
                  <div style={{ textAlign: "center", padding: "24px 0", color: "#8C8C8C" }}>
                    No baristas available right now.
                  </div>
                )}

                {/* Barista list */}
                {!loading &&
                  !error &&
                  baristas.map((barista: Barista) => {
                    const isSelected = selectedId === barista.id;
                    const isExpanded = expandedId === barista.id;
                    const avatarSrc = barista.profileImage ?? baristaimage;
                    const DESC_LIMIT = 60;
                    const hasMore = barista.fullDesc.length > DESC_LIMIT;

                    return (
                      <div key={barista.id} className={styles.BaristaItem}>
                        <div className={styles.BaristaItemLeft}>
                          <div className={styles.BaristaImage}>
                            <img
                              src={avatarSrc}
                              alt={barista.name}
                              onError={(e) => {
                                (e.currentTarget as HTMLImageElement).src =
                                  baristaimage as string;
                              }}
                            />
                          </div>

                          <div className={styles.BaristaDetails}>
                            <div className={styles.BaristaNameandTag}>
                              <h4>{barista.name}</h4>
                              <div
                                className={styles.descriptionWrapper}
                                style={{
                                  height: isExpanded
                                    ? `${
                                        document.getElementById(
                                          `desc-${barista.id}`
                                        )?.scrollHeight
                                      }px`
                                    : "16px",
                                }}
                              >
                                <div
                                  id={`desc-${barista.id}`}
                                  className={styles.descriptionInner}
                                >
                                  <p>
                                    {isExpanded || !hasMore
                                      ? barista.fullDesc
                                      : barista.fullDesc.slice(0, DESC_LIMIT) + "..."}
                                  </p>
                                </div>
                              </div>
                            </div>

                            {hasMore && (
                              <div
                                className={styles.viewmore}
                                onClick={() => handleExpand(barista.id)}
                              >
                                <p>{isExpanded ? "View less" : "View more"}</p>
                              </div>
                            )}
                          </div>
                        </div>

                        <div
                          className={`${styles.BaristaItemRight} ${
                            isSelected ? styles.selected : ""
                          }`}
                          onClick={() => handleSelect(barista.id)}
                        >
                          {isSelected && (
                            <svg
                              width="16"
                              height="16"
                              viewBox="0 0 16 16"
                              fill="none"
                              xmlns="http://www.w3.org/2000/svg"
                            >
                              <path
                                d="M3 8L6.5 11.5L13 5"
                                stroke="#fff"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>
                          )}
                        </div>
                      </div>
                    );
                  })}
              </div>

              <div className={styles.ConfirmCta}>
                <button
                  disabled={!selectedId}
                  onClick={() => {
                    if (!selectedId) return;
                    const found = baristas.find((b) => b.id === selectedId);
                    if (found) {
                      onConfirm({
                        id: found.id,
                        name: found.name,
                        shortDesc: found.shortDesc,
                      });
                    }
                  }}
                >
                  Confirm
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default BaristaSheet;