import React, { useState, useEffect } from "react";
import styles from "./Customization.module.css";

type VegType = "Veg" | "NonVeg" | "Egg" | "Vegan";

const VegIcon = () => (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M0 11.4814V0H11.4814V11.4814H0ZM1.27571 10.2056H10.2056V1.27571H1.27571V10.2056ZM5.74068 8.29209C5.03904 8.29209 4.43839 8.04226 3.93874 7.54261C3.43909 7.04296 3.18926 6.44231 3.18926 5.74068C3.18926 5.03904 3.43909 4.43839 3.93874 3.93874C4.43839 3.43909 5.03904 3.18926 5.74068 3.18926C6.44231 3.18926 7.04296 3.43909 7.54261 3.93874C8.04226 4.43839 8.29209 5.03904 8.29209 5.74068C8.29209 6.44231 8.04226 7.04296 7.54261 7.54261C7.04296 8.04226 6.44231 8.29209 5.74068 8.29209Z" fill="#34A853"/>
  </svg>
);

const NonVegIcon = () => (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="0.5" y="0.5" width="11" height="11" rx="1.5" stroke="#A83434"/>
    <polygon points="6,2 11,10 1,10" fill="#A83434"/>
  </svg>
);

const EggIcon = () => (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="0.5" y="0.5" width="11" height="11" rx="1.5" stroke="#F9AB00"/>
    <ellipse cx="6" cy="6" rx="3" ry="4" fill="#F9AB00"/>
  </svg>
);

const VeganIcon = () => (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M0 11.3632V0H11.3632V11.3632H0ZM1.26258 10.1007H10.1007V1.26258H1.26258V10.1007ZM5.68162 8.20679C4.9872 8.20679 4.39274 7.95953 3.89822 7.46502C3.40371 6.97051 3.15646 6.37604 3.15646 5.68162C3.15646 4.9872 3.40371 4.39274 3.89822 3.89822C4.39274 3.40371 4.9872 3.15646 5.68162 3.15646C6.37604 3.15646 6.97051 3.40371 7.46502 3.89822C7.95953 4.39274 8.20679 4.9872 8.20679 5.68162C8.20679 6.37604 7.95953 6.97051 7.46502 7.46502C6.97051 7.95953 6.37604 8.20679 5.68162 8.20679Z" fill="#0F9D58"/>
  </svg>
);

const VegTypeIcon = ({ type }: { type?: VegType }) => {
  switch (type) {
    case "NonVeg": return <NonVegIcon />;
    case "Egg":    return <EggIcon />;
    case "Vegan":  return <VeganIcon />;
    default:       return <VegIcon />;
  }
};

interface CustomizationProps {
  isOpen: boolean;
  product: ProductWithCustomization | null;
  onClose: () => void;
  existingCartCount?: number; 
  onConfirm: (data: {
    bagAmount: string;
    size: string;
    quantity: number;
    // Pass the selected options so callers can map to backend format
    selectedOptions?: {
      [sectionId: string]: {
        [groupId: string]: CustomizationOption[];
      };
    };
  }) => void;
  /** Pre-selected options — used when editing an existing cart item */
  initialSelections?: {
    [sectionId: string]: {
      [groupId: string]: CustomizationOption[];
    };
  };
}
interface CustomizationOption {
  id: string;
  label: string;
  price: number;
}

interface CustomizationGroup {
  id: string;
  groupTitle: string;
  options: CustomizationOption[];
}

interface CustomizationSection {
  id: string;
  title: string;
  selectionType: "single" | "multiple";
  groups: CustomizationGroup[];
}

interface ProductCustomization {
  id: string;
  title: string;
  sections: CustomizationSection[];
}

interface ProductWithCustomization {
  name: string;
  price: number;
  vegType?: VegType;
  customizations?: ProductCustomization[];
}
const Customization: React.FC<CustomizationProps> = ({
  isOpen,
  product,
  onClose,
  onConfirm,
  initialSelections,
  
}) => {
  const [isClosing, setIsClosing] = useState(false);
  const [selectedOptions, setSelectedOptions] = useState<{
    [sectionId: string]: {
      [groupId: string]: CustomizationOption[];
    };
  }>({});
  const [quantity, setQuantity] = useState(1);
  const handleOptionSelect = (
    section: CustomizationSection,
    group: CustomizationGroup,
    option: CustomizationOption,
    checked: boolean,
  ) => {
    setSelectedOptions((prev) => {
      const sectionData = prev[section.id] || {};
      const groupData = sectionData[group.id] || [];

      let updatedGroup;

      if (section.selectionType === "single") {
        // For single-selection sections we treat the entire section as one choice
        // (only one option across all groups). If the clicked option is already
        // selected, clear the whole section. Otherwise replace the section
        // selection with the newly chosen option in its group.
        const alreadySelected =
          Object.values(sectionData).some((arr) => arr.length === 1 && arr[0].id === option.id);
        if (alreadySelected) {
          // clear whole section
          return {
            ...prev,
            [section.id]: {},
          };
        }

        // not already selected -> set this group's selection to the option and
        // remove selections from other groups in this section
        return {
          ...prev,
          [section.id]: {
            [group.id]: [option],
          },
        };
      } else {
        if (checked) {
          updatedGroup = [...groupData, option];
        } else {
          updatedGroup = groupData.filter((o) => o.id !== option.id);
        }
      }

      return {
        ...prev,
        [section.id]: {
          ...sectionData,
          [group.id]: updatedGroup,
        },
      };
    });
  };
  useEffect(() => {
    if (isOpen) {
      // If editing an existing cart item, pre-fill with its saved selections
      if (initialSelections) {
        setSelectedOptions(initialSelections ?? {});
      } else {
        // No initial selections: for any single-selection sections ("Required" ones)
        // pre-select one option per section (not one per group). We pick the
        // first available option from the first group that has options.
        const defaults: {
          [sectionId: string]: {
            [groupId: string]: CustomizationOption[];
          };
        } = {};
        if (product?.customizations) {
          product.customizations.forEach((c) => {
            (c.sections || []).forEach((s) => {
              if (s.selectionType === "single") {
                // Find the first group that has options and pick its first option
                const foundGroup = (s.groups || []).find((g) => Array.isArray(g.options) && g.options.length > 0);
                if (foundGroup) {
                  defaults[s.id] = {
                    [foundGroup.id]: [foundGroup.options[0]],
                  };
                }
              }
            });
          });
        }

        setSelectedOptions(defaults);
      }

      setQuantity(1);
    }
  }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!isOpen || !product) return null;

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      onClose();
      setIsClosing(false);
    }, 300);
  };
  const handleConfirm = () => {
    // If product has no customizations, allow direct add
    if (!product.customizations || product.customizations.length === 0) {
      onConfirm({ bagAmount: "", size: "", quantity, selectedOptions });
      handleClose();
      return;
    }

    // Validate required single-selection sections
    for (const custom of product.customizations) {
      for (const section of custom.sections) {
        if (section.selectionType === "single") {
          const sectionSelections = selectedOptions[section.id] || {};
          const hasAny = Object.values(sectionSelections).some((arr) => (arr && arr.length > 0));
          if (!hasAny) {
            alert(`Please select an option for: ${section.title}`);
            return;
          }
        }
      }
    }

    onConfirm({ bagAmount: "", size: "", quantity, selectedOptions });
    handleClose();
  };

  const optionsTotal = Object.values(selectedOptions).reduce(
    (sectionAcc: number, groupObj) => {
      return (
        sectionAcc +
        Object.values(groupObj).reduce(
          (groupAcc: number, options) =>
            groupAcc +
            options.reduce((optAcc: number, opt) => optAcc + opt.price, 0),
          0,
        )
      );
    },
    0,
  );

  const totalPrice = (product.price + optionsTotal) * quantity;

  const hasCustomizations = !!(product.customizations && product.customizations.length > 0);

  // Determine whether all required (single-selection) sections have a selection
  const requiredSections: CustomizationSection[] = [];
  if (product.customizations) {
    product.customizations.forEach((c) => {
      (c.sections || []).forEach((s) => {
        if (s.selectionType === "single") requiredSections.push(s);
      });
    });
  }

  const allRequiredSelected = requiredSections.length === 0 ? true : requiredSections.every((section) => {
    const sectionSelections = selectedOptions[section.id] || {};
    return Object.values(sectionSelections).some((arr) => Array.isArray(arr) && arr.length > 0);
  });

  const canConfirm = !hasCustomizations || allRequiredSelected;

  return (
    <div
      className={`${styles.overlay} ${isClosing ? styles.overlayClose : ""}`}
      onClick={handleClose}
    >
      <div
        className={`${styles.main} ${isClosing ? styles.close : ""} ${!hasCustomizations ? styles.mini : ""}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.MainContainer}>
          <div className={styles.Top}>
            <div className={styles.subscrihead}>
              <div className={styles.subscripheadtext}>
                <VegTypeIcon type={product.vegType} />
                <h3>{product.name}</h3>
              </div>
              <div className={styles.wrong} onClick={handleClose}>
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
            <div className={styles.line}></div>
          </div>

          {/* Only render middle section when product has customizations */}
          {product.customizations && product.customizations.length > 0 && (
            <div className={styles.Middle}>
              {product.customizations.map((custom) =>
                custom.sections.map((section) => (
                  <div key={section.id} className={styles.BagContainer}>
                    <div className={styles.BagTitle}>
                      <h3>{section.title}</h3>
                      {section.selectionType === "single" ? (
                        <p className={styles.RequiredTag}>Required</p>
                      ) : null}
                    </div>

                    {section.groups.map((group) => (
                      <div key={group.id} className={styles.gapconatinerveer}>
                        <div className={styles.SubHeading}>
                          <h4>{group.groupTitle}</h4>
                        </div>

                        {group.options.map((option) => (
                          <div
                            key={option.id}
                            className={styles.Bagqntyselectbtn}
                          >
                            <div
                              style={{
                                display: "flex",
                                gap: "6px",
                                alignItems: "center",
                              }}
                            >
                              <h3>{option.label}</h3>
                            </div>

                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              {option.price > 0 && (
                                <span className={styles.ExtraPrice}>
                                  + AED {option.price}
                                </span>
                              )}
                              <input
                                type={
                                  section.selectionType === "single"
                                    ? "radio"
                                    : "checkbox"
                                }
                                name={
                                  section.selectionType === "single"
                                    ? `${section.id}`
                                    : `${section.id}-${group.id}`
                                }
                                checked={
                                  selectedOptions[section.id]?.[group.id]?.some(
                                    (o) => o.id === option.id,
                                  ) || false
                                }
                                onChange={(e) => {
                                  if (section.selectionType === "single") {
                                    // For radios, determine if this option is already selected
                                    // and toggle it off if so. We ignore e.target.checked because
                                    // the browser's native radio behavior can conflict with our
                                    // controlled state; compute desired state from current state.
                                    const alreadySelected =
                                      selectedOptions[section.id]?.[group.id]?.length === 1 &&
                                      selectedOptions[section.id][group.id][0].id === option.id;
                                    handleOptionSelect(section, group, option, !alreadySelected);
                                  } else {
                                    handleOptionSelect(section, group, option, (e.target as HTMLInputElement).checked);
                                  }
                                }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                )),
              )}
            </div>
          )}

          <div className={styles.Bottom}>
           <div className={styles.QuantityWrapper}>
  <button
    onClick={() => setQuantity((prev) => (prev > 1 ? prev - 1 : 1))}
  >
    −
  </button>
  <span>{quantity}</span>
  <button onClick={() => setQuantity((prev) => prev + 1)}>+</button>
</div>


            <button
              className={styles.AddItemButton}
              onClick={canConfirm ? handleConfirm : undefined}
              disabled={!canConfirm}
              aria-disabled={!canConfirm}
            >
              Add Item | AED {totalPrice}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Customization;
