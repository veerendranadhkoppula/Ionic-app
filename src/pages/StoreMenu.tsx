import { IonContent, IonHeader, IonPage, IonFooter } from "@ionic/react";
import useNetworkStatus from "../hooks/useNetworkStatus";
import OfflineOverlay from "../components/OfflineOverlay/OfflineOverlay";
import { useState, useEffect } from "react";
import "./Home.css";

import Landing from "../components/StoreMenu/Landing/Landing";
import Banner from "../components/StoreMenu/Banner/Banner";
import CatagoriesBar from "../components/StoreMenu/CatagoriesBar/CatagoriesBar";
import StoreMain from "../components/StoreMenu/StoreMain/StoreMain";
import StickBar from "../components/Home/StickBar/StickBar";
import FullScreenLoader from "../components/FullScreenLoader";
import { useLocation } from "react-router-dom";
import {
  getStoreProducts,
  getStoreCategories,
  getStoreSubCategories,
  StoreProduct,
  WebCategory,
  SubCatLevel1,
} from "../api/apiStoreMenu";

const StoreMenu: React.FC = () => {
const location = useLocation();

  const { online } = useNetworkStatus();

const params = new URLSearchParams(location.search);
const categoryFromURL = params.get("category");

const [activeCategory, setActiveCategory] = useState(
  categoryFromURL ? decodeURIComponent(categoryFromURL) : ""
);

const [products, setProducts] = useState<StoreProduct[]>([]);
const [categories, setCategories] = useState<WebCategory[]>([]);
const [subCategories, setSubCategories] = useState<SubCatLevel1[]>([]);
const [loadingProducts, setLoadingProducts] = useState(true);
// Re-apply URL category param whenever location changes (handles Ionic page cache)
useEffect(() => {
  const params = new URLSearchParams(location.search);
  const urlCategory = params.get("category");
  if (!urlCategory) return;
  if (categories.length === 0) return; // categories not loaded yet, handled in fetch effect

  const decoded = decodeURIComponent(urlCategory).toLowerCase();
  const matched = categories.find(
    (c) => c.title.toLowerCase() === decoded
  ) ?? categories.find(
    (c) => c.title.toLowerCase().includes(decoded) || decoded.includes(c.title.toLowerCase())
  );
  if (matched) {
    setActiveCategory(matched.title);
  }
}, [location.search, categories]);
  // Preload product images and resolve when all loaded or timeout
  const preloadProductImages = async (items: StoreProduct[], timeoutMs = 5000) => {
    const urls = Array.from(new Set(items.map((p) => p.productImage?.url).filter(Boolean) as string[]));
    if (urls.length === 0) return;

    await new Promise<void>((resolve) => {
      let remaining = urls.length;
      let finished = false;

      const tryFinish = () => {
        if (finished) return;
        if (remaining <= 0) {
          finished = true;
          resolve();
        }
      };

      urls.forEach((u) => {
        try {
          const img = new Image();
          img.onload = () => {
            remaining -= 1;
            tryFinish();
          };
          img.onerror = () => {
            // consider errored images as 'loaded' to avoid blocking
            remaining -= 1;
            tryFinish();
          };
          img.src = u;
        } catch {
          remaining -= 1;
          tryFinish();
        }
      });

      // Fallback timeout: don't wait indefinitely
      setTimeout(() => {
        if (finished) return;
        finished = true;
        resolve();
      }, timeoutMs);
    });
  };

// Fetch categories once on mount
useEffect(() => {
  console.log("[StoreMenu] fetching categories...");
  getStoreCategories()
    .then((cats) => {
      const sorted = [...cats].sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );
      console.log("[StoreMenu] categories loaded:", sorted.map((c) => c.title));
      setCategories(sorted);

      // Re-read URL param here (not from stale closure) so navigation from
      // ShopCategories always wins over the default first-category fallback.
      const params = new URLSearchParams(window.location.search);
      const urlCategory = params.get("category");
      if (urlCategory) {
        // Find exact match (case-insensitive) in loaded categories
const decoded = decodeURIComponent(urlCategory).toLowerCase();
const decodedNoSpace = decoded.replace(/\s+/g, "");
const matched = sorted.find(
  (c) => c.title.toLowerCase() === decoded
) ?? sorted.find(
  (c) => c.title.toLowerCase().replace(/\s+/g, "") === decodedNoSpace
) ?? sorted.find(
  (c) => c.title.toLowerCase().includes(decoded) || decoded.includes(c.title.toLowerCase())
) ?? sorted.find(
  (c) => c.title.toLowerCase().replace(/\s+/g, "").includes(decodedNoSpace) || decodedNoSpace.includes(c.title.toLowerCase().replace(/\s+/g, ""))
);
setActiveCategory(matched ? matched.title : decodeURIComponent(urlCategory));
      } else if (!activeCategory && sorted.length > 0) {
        setActiveCategory(sorted[0].title);
      }
    })
    .catch((err) => console.error("[StoreMenu] categories error:", err));
}, []); // eslint-disable-line react-hooks/exhaustive-deps

// Fetch sub-categories when active category changes
useEffect(() => {
  if (!activeCategory || categories.length === 0) return;

  const cat = categories.find((c) => c.title === activeCategory);
  if (!cat) return;

  console.log("[StoreMenu] fetching sub-categories for:", cat.slug);
  getStoreSubCategories(cat.slug)
    .then((subs) => {
      console.log("[StoreMenu] sub-categories loaded:", subs.map((s) => s.name));
      setSubCategories(subs);
    })
    .catch((err) => console.error("[StoreMenu] sub-categories error:", err));
}, [activeCategory, categories]);

// Fetch all products once
useEffect(() => {
  console.log("[StoreMenu] fetching store products...");
  setLoadingProducts(true);
  getStoreProducts()
    .then(async (data) => {
      console.log("[StoreMenu] products loaded:", data.length);
      setProducts(data);
        try {
          await preloadProductImages(data, 7000);
        } catch {
          console.warn('[StoreMenu] image preload failed or timed out');
        } finally {
        // If there were no images at all, preloadProductImages returns immediately.
        setLoadingProducts(false);
      }
    })
    .catch((err) => {
      console.error("[StoreMenu] failed to load products:", err);
      setLoadingProducts(false);
    });
}, []);

  return (
    <IonPage>
      <IonHeader slot="fixed">
        <Landing />
      </IonHeader>

      <IonContent fullscreen className="home-content">
        {!online ? (
          <OfflineOverlay />
        ) : (loadingProducts ? (
          // While products are loading show the same full-screen loader as
          // the cafe menu — don't render banner/main content underneath.
          <div style={{ height: "100%" }}>
            <FullScreenLoader />
          </div>
        ) : (
          <>
            <Banner />

            <CatagoriesBar
              activeCategory={activeCategory}
              setActiveCategory={setActiveCategory}
              categories={categories.map((c) => c.title)}
            />

            <StoreMain
              activeCategory={activeCategory}
              subCategories={subCategories}
              products={products}
              loading={loadingProducts}
            />

          
          </>
        ))}
      </IonContent>
       <IonFooter>
        <StickBar />
      </IonFooter>
      {/* Portal target for store sheets so they render outside the scrollable IonContent
          and do not get covered by the Ionic footer. */}
      <div id="store-sheets-root" />
    </IonPage>
  );
};

export default StoreMenu;
