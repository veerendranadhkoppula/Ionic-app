/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  IonContent,
  IonPage,
  IonFooter,
  useIonRouter,
  IonHeader,
} from "@ionic/react";
import { App } from "@capacitor/app";
import { useEffect, useRef, useState } from "react";

import Landing from "../components/Home/Landing/Landing";
import StickBar from "../components/Home/StickBar/StickBar";
import Banner from "../components/Home/Banner/Banner";
import TagLine from "../components/Home/TagLine/TagLine";

import "./Home.css";
import BlogsSection from "../components/Home/BlogsSection/BlogsSection";
import RewardsSection from "../components/Home/RewardsSection/RewardsSection";
import CafeShopCat from "../components/Home/CafeShopCat/CafeShopCat";
import CafeCategories from "../components/Home/CafeCategories/CafeCategories";
import ShopCategories from "../components/Home/ShopCategories/ShopCategories";
import Crafted from "../components/Home/Crafted/Crafted";
import StickOrderStatusBar from "../components/Home/StickOrderStatusBar/StickOrderStatusBar";
import CafeClose from "../components/Home/CafeClose/CafeClose";
import { getSingleShop, isShopOpen } from "../api/apiCafe";
// import DevNote from "../components/Home/DevNote/DevNote";
import { getCurrentUser } from "../utils/authStorage";


const Home: React.FC = () => {
  const ionRouter = useIonRouter();
  const lastBackPress = useRef<number>(0);
  const [showExitToast, setShowExitToast] = useState(false);
  const exitToastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Shop open/close state for showing CafeClose on the home screen
  const [shopClosed, setShopClosed] = useState(false);
  const [openingTime, setOpeningTime] = useState<string | null>(null);
  const user = getCurrentUser();

  useEffect(() => {
    let listener: any;

    const setup = async () => {
      listener = await App.addListener("backButton", () => {
        if (ionRouter.routeInfo.pathname === "/home") {
          const currentTime = new Date().getTime();

          if (currentTime - lastBackPress.current < 2000) {
            App.exitApp();
          } else {
            lastBackPress.current = currentTime;

            setShowExitToast(true);
            if (exitToastTimer.current) clearTimeout(exitToastTimer.current);
            exitToastTimer.current = setTimeout(() => {
              setShowExitToast(false);
            }, 2000);
          }
        }
      });
    };

    setup();

    return () => {
      listener?.remove();
      if (exitToastTimer.current) clearTimeout(exitToastTimer.current);
    };
  }, [ionRouter]);

  useEffect(() => {
    let mounted = true;
    getSingleShop()
      .then((shop) => {
        if (!mounted) return;
        const closed = !isShopOpen(shop);
        setShopClosed(closed);
        setOpeningTime(shop?.operationalSettings?.openingTime ?? null);
      })
      .catch(() => {
        // If fetch fails, default to open (don't block users)
        if (!mounted) return;
        setShopClosed(false);
        setOpeningTime(null);
      });

    return () => { mounted = false; };
  }, []);
  return (
    <IonPage>
      <IonHeader slot="fixed">
        <Landing />
      </IonHeader>
      <IonContent fullscreen className="home-content">
  {shopClosed && <CafeClose openingTime={openingTime} />}
        <Banner />
  {/* <DevNote /> */}
  {!user?.isGuest && <RewardsSection />}
        <CafeShopCat />
        <CafeCategories />
        <ShopCategories />

        <BlogsSection />
        <Crafted />

        <TagLine />
      </IonContent>

      <IonFooter>
      <StickOrderStatusBar />
        <StickBar />
      </IonFooter>

      {showExitToast && (
        <div className="exit-toast-custom">
          <div className="exit-toast-icon">
            <svg width="12" height="13" viewBox="0 0 12 13" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M9.60756 0C9.63931 0.0158761 9.67447 0.0272161 9.70168 0.0476282C9.80714 0.123607 9.82529 0.264223 9.74364 0.378758C9.48509 0.742773 9.2254 1.10565 8.96572 1.46854C8.95438 1.48441 8.94417 1.50029 8.92943 1.52297C8.95325 1.5241 8.97026 1.52637 8.98613 1.52637C9.16757 1.52637 9.34901 1.52637 9.53045 1.52637C10.229 1.52637 10.6372 2.23626 10.288 2.84182C9.1018 4.89663 7.91451 6.95145 6.72835 9.00627C6.43578 9.51317 6.14321 10.0189 5.85177 10.5258C5.80528 10.6063 5.74064 10.654 5.64652 10.6562C5.54786 10.6574 5.47982 10.6086 5.43106 10.5247C5.21787 10.1539 5.00241 9.78306 4.78922 9.41224C3.52255 7.21907 2.25588 5.02591 0.990344 2.83274C0.726124 2.37461 0.908696 1.80647 1.38611 1.59895C1.49724 1.55132 1.61291 1.52864 1.73424 1.52864C1.93836 1.52864 2.14362 1.52864 2.35907 1.52864C2.34547 1.50709 2.33526 1.49122 2.32505 1.47761C2.06537 1.11246 1.80455 0.748443 1.54487 0.383294C1.45301 0.255151 1.48817 0.0941224 1.62084 0.0283501C1.64012 0.0192781 1.6594 0.01134 1.67868 0.00340201C1.71043 0.00340201 1.74218 0.00340201 1.77507 0.00340201C1.85558 0.0317521 1.90774 0.0907204 1.95651 0.158761C2.26949 0.601023 2.58587 1.04215 2.89999 1.48441C2.92267 1.51616 2.94535 1.52977 2.98617 1.52977C4.7586 1.52864 6.53217 1.52864 8.3046 1.52977C8.34429 1.52977 8.36811 1.51843 8.39192 1.48555C8.7049 1.04442 9.01902 0.605559 9.332 0.164431C9.37736 0.0918544 9.42952 0.0294841 9.51117 0C9.54292 0 9.57581 0 9.60756 0ZM5.64198 9.9577C5.65673 9.93388 5.66693 9.91687 5.67714 9.89986C5.85631 9.59028 6.03548 9.28183 6.21125 8.97111C6.23053 8.93596 6.24414 8.89173 6.24414 8.85204C6.24527 7.43454 6.2464 6.01703 6.24414 4.59952C6.24414 4.52128 6.26568 4.4555 6.31104 4.392C6.8701 3.60954 7.42916 2.82594 7.98708 2.04348C7.99729 2.02873 8.0075 2.01286 8.0211 1.99245H3.264C3.27874 2.01399 3.28895 2.02987 3.29915 2.04461C3.85708 2.82594 4.41387 3.6084 4.97293 4.3886C5.01942 4.45437 5.04097 4.52128 5.04097 4.60179C5.03983 6.0227 5.04097 7.44474 5.04097 8.86565C5.04097 8.89853 5.05117 8.93596 5.06818 8.96544C5.24736 9.27843 5.42766 9.59141 5.60797 9.90326C5.61817 9.92027 5.62838 9.93615 5.64198 9.9577ZM4.56696 8.09566L4.5783 8.09226C4.5783 8.07298 4.5783 8.0537 4.5783 8.03442C4.5783 6.96733 4.57603 5.90023 4.58057 4.83199C4.58057 4.69365 4.54655 4.58365 4.4649 4.47138C3.88089 3.66057 3.30256 2.84635 2.72195 2.03214C2.70494 2.00719 2.6902 1.98564 2.65164 1.98678C2.34547 1.98904 2.03929 1.98678 1.73424 1.98791C1.61404 1.98791 1.51198 2.031 1.43147 2.12172C1.31013 2.25894 1.29879 2.43698 1.39858 2.61161C2.44526 4.42489 3.49193 6.23816 4.53861 8.05143C4.54768 8.06618 4.55675 8.08092 4.56583 8.09566H4.56696ZM6.70907 8.08886C6.70907 8.08886 6.71701 8.09112 6.72041 8.09226C6.72948 8.07752 6.73856 8.06164 6.74649 8.0469C6.95175 7.69195 7.157 7.33588 7.36225 6.98093C8.20254 5.52487 9.04397 4.06881 9.88312 2.61275C9.9126 2.56172 9.93869 2.50275 9.94662 2.44491C9.98178 2.19657 9.7992 1.99131 9.54292 1.99018C9.24808 1.98791 8.95211 1.99018 8.65727 1.98904C8.61078 1.98904 8.5847 2.00265 8.55748 2.04007C7.95193 2.89171 7.34411 3.74335 6.73742 4.59499C6.71928 4.61994 6.70794 4.65622 6.70794 4.68684C6.7068 5.8061 6.7068 6.92423 6.7068 8.0435V8.08999L6.70907 8.08886Z" fill="white"/>
              <path d="M4.8569 12.4243C4.77865 12.4028 4.72876 12.3495 4.6834 12.2849C3.2092 10.2017 1.73274 8.11966 0.257417 6.03762C0.121338 5.84484 0.031752 5.63618 0.00907216 5.40031C0.00907216 5.39011 0.00340198 5.3799 0 5.36969C0 5.30619 0 5.24155 0 5.17805C0.0136079 5.1066 0.0238139 5.03403 0.0408239 4.96372C0.120203 4.6428 0.299375 4.38991 0.573802 4.20507C0.644109 4.15744 0.716685 4.11322 0.791528 4.06445C0.865238 4.18352 0.937813 4.29919 1.01266 4.41826C0.951421 4.45795 0.89132 4.49651 0.832352 4.53507C0.393496 4.81857 0.289169 5.35835 0.591945 5.78587C1.93686 7.6842 3.28064 9.58139 4.62556 11.4786C4.63577 11.4922 4.64597 11.5058 4.66979 11.5183V10.2652C4.66979 10.2652 4.67999 10.2629 4.68566 10.2618C4.6936 10.272 4.70154 10.2811 4.70834 10.2924C4.82628 10.4954 4.94421 10.6984 5.05988 10.9025C5.07236 10.924 5.07916 10.9524 5.07916 10.9773C5.0871 11.3833 5.09277 11.7882 5.09957 12.1941C5.10184 12.3121 5.05308 12.3756 4.92153 12.4266H4.85803L4.8569 12.4243Z" fill="white"/>
              <path d="M11.2501 5.36906C11.2388 5.43483 11.2286 5.50174 11.2138 5.56638C11.1741 5.73421 11.0993 5.88617 10.9995 6.02792C9.86211 7.6314 8.72584 9.23602 7.58958 10.8406C7.24825 11.3226 6.90692 11.8034 6.56672 12.2854C6.52136 12.35 6.47147 12.4033 6.39322 12.4248H6.32972C6.18343 12.3681 6.14941 12.3126 6.15281 12.1549C6.16075 11.766 6.16529 11.3759 6.17209 10.9869C6.17209 10.9552 6.1823 10.92 6.19704 10.8928C6.3093 10.6943 6.42384 10.4982 6.53724 10.3008C6.54517 10.2872 6.55425 10.2748 6.56899 10.2634C6.60187 10.6819 6.5826 11.1003 6.58486 11.5324C6.60301 11.5086 6.61435 11.4938 6.62455 11.4791C7.86854 9.72364 9.11254 7.9682 10.3554 6.21276C10.4586 6.06761 10.5618 5.92246 10.6638 5.7773C10.9575 5.35999 10.8532 4.81794 10.4257 4.54011C10.3645 4.50042 10.3032 4.46072 10.2363 4.41763C10.31 4.2997 10.3826 4.18289 10.454 4.06836C10.8317 4.26681 11.1095 4.54464 11.2104 4.96763C11.2263 5.0368 11.2365 5.10711 11.249 5.17628V5.36793L11.2501 5.36906Z" fill="white"/>
            </svg>
          </div>
          <span className="exit-toast-text">Press back again to exit</span>
        </div>
      )}
    </IonPage>
  );
};

export default Home;
