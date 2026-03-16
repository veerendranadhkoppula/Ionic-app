import React from "react";
import styles from "./SpecialInstructions.module.css";
import { useCheckout } from "../../../../context/CafeCheckoutContext";
import { useHistory } from "react-router";

const SpecialInstructions: React.FC = () => {
  const { specialInstructions, setSpecialInstructions } = useCheckout();
  const history = useHistory();
  const [isInstructionOpen, setIsInstructionOpen] = React.useState(false);
  const [tempInstruction, setTempInstruction] = React.useState("");

  return (
    <>
      <div className={styles.main}>
        <div className={styles.container}>
          <div className={styles.otherimps}>
            <div className={styles.Addmorecta} onClick={() => history.push("/CafeMenu")}>
              <p>+ Add more</p>
            </div>

            {!specialInstructions ? (
              <div
                className={styles.specialinstructions}
                onClick={() => {
                  setTempInstruction(specialInstructions);
                  setIsInstructionOpen(true);
                }}
              >
                <svg
                  width="16"
                  height="15"
                  viewBox="0 0 16 15"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M7.23744 12.4994H13.3327M11.8089 4.64221L12.5708 5.3565M12.9517 2.8565C13.1019 2.99714 13.2211 3.16415 13.3024 3.348C13.3837 3.53184 13.4255 3.72891 13.4255 3.92792C13.4255 4.12694 13.3837 4.32401 13.3024 4.50785C13.2211 4.6917 13.1019 4.85871 12.9517 4.99935L5.71363 11.7851L2.66602 12.4994L3.42792 9.68221L10.6691 2.85935C10.9545 2.59048 11.3373 2.43204 11.7415 2.4155C12.1458 2.39896 12.5418 2.52552 12.8512 2.77007L12.9517 2.8565Z"
                    stroke="#4B3827"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <p>Special Instructions</p>
              </div>
            ) : (
              <div
                className={styles.savedInstructionWrapper}
                onClick={() => {
                  setTempInstruction(specialInstructions);
                  setIsInstructionOpen(true);
                }}
              >
                <div className={styles.savedInstructionTop}>
                  <p className={styles.savedTitle}>Special Requests</p>
                  <span
                    className={styles.removeInstruction}
                    onClick={(e) => { e.stopPropagation(); setSpecialInstructions(""); }}
                  >
                    ✕
                  </span>
                </div>
              </div>
            )}
          </div>

          {specialInstructions && (
            <div
              className={styles.savedInstructionBox}
              onClick={() => {
                setTempInstruction(specialInstructions);
                setIsInstructionOpen(true);
              }}
            >
              {specialInstructions}
            </div>
          )}
        </div>
      </div>

      {isInstructionOpen && (
        <div
          className={styles.overlay}
          onClick={() => setIsInstructionOpen(false)}
        >
          <div
            className={styles.instructionPopup}
            onClick={(e) => e.stopPropagation()}
          >
            <h3>Enter your instructions</h3>
            <textarea
              value={tempInstruction}
              onChange={(e) => setTempInstruction(e.target.value)}
              placeholder="The restaurant will try its best to follow your request"
              maxLength={100}
            />
            <p style={{ textAlign: "right", fontSize: 11, color: "#8C8C8C", margin: "4px 0 0 0", fontFamily: "var(--lato)" }}>
              {tempInstruction.length}/100
            </p>
            <button
              onClick={() => {
                setSpecialInstructions(tempInstruction);
                setIsInstructionOpen(false);
              }}
            >
              Save
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default SpecialInstructions;
