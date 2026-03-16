import React from "react";

import styles from "./TagLine.module.css";

const TagLine: React.FC = () => {
  return (
    <>
    <div className={styles.main}>
        <div className={styles.TagLineContainer}>
            <h3>From The Farm -< br/> Through Us - < br/>To Everyone</h3>

        </div>

    </div>
    </>
  );
};

export default TagLine;
