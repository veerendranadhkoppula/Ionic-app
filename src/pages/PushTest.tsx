import React, { useState, useEffect } from "react";
import { IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonButton, IonText } from "@ionic/react";
import { PushNotifications } from "@capacitor/push-notifications";
import { Capacitor, type PluginListenerHandle } from "@capacitor/core";
import tokenStorage from "../utils/tokenStorage";
import { registerFcmToken } from "../api/apiCafeNotifications";

const PushTest: React.FC = () => {
  const [token, setToken] = useState<string>("");
  const [status, setStatus] = useState<string>("");

  const getToken = async () => {
    setStatus("");
    if (!Capacitor.isNativePlatform()) {
      setStatus("Not running on a native device.");
      return;
    }

    try {
      const perm = await PushNotifications.requestPermissions();
      if (perm.receive !== "granted") {
        setStatus("Permission not granted.");
        return;
      }

      // Add a single registration listener and keep its handle so we can remove it later.
      const regHandle = await PushNotifications.addListener("registration", async (t) => {
        try {
          setToken(t.value);
          setStatus("Got token, uploading to backend...");
          const jwt = await tokenStorage.getToken();
          if (!jwt) {
            setStatus("No JWT present — please log in first.");
            return;
          }
          await registerFcmToken(jwt, t.value);
          setStatus("Uploaded token to backend (check admin panel).");
        } catch (e) {
          console.warn("PushTest upload failed", e);
          setStatus("Upload failed — see device logs.");
        }
      });

  // Remove the registration listener when the user navigates away / component unmounts.
  // Store on window for a short-lived lifetime so cleanup works even if the component
  // unmounts before the event fires.
  const w = window as unknown as { __pushTestRegHandle?: PluginListenerHandle };
  w.__pushTestRegHandle = regHandle;

      await PushNotifications.register();
      setStatus("Registering... awaiting token event.");
    } catch (e) {
      console.warn("PushTest error", e);
      setStatus("Registration failed — see device logs.");
    }
  };

  useEffect(() => {
    return () => {
      // cleanup the registration listener if present
      const w = window as unknown as { __pushTestRegHandle?: PluginListenerHandle };
      const h = w.__pushTestRegHandle;
      if (h && typeof h.remove === "function") {
        try { h.remove(); } catch { /* ignore */ }
        delete w.__pushTestRegHandle;
      }
    };
  }, []);

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Push Test</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent className="ion-padding">
        <h3>Push Notification Test</h3>
        <p>Tap the button to request permission, get the device token, and upload it to the backend.</p>
        <IonButton expand="block" onClick={getToken}>Get Device Token & Upload</IonButton>

        {status && (
          <div style={{ marginTop: 16 }}>
            <IonText><strong>Status:</strong> {status}</IonText>
          </div>
        )}

        {token && (
          <div style={{ marginTop: 16 }}>
            <IonText color="success"><strong>Token:</strong></IonText>
            <div style={{ marginTop: 8, wordBreak: "break-all", background: "#f6f6f6", padding: 8, borderRadius: 6 }}>{token}</div>
          </div>
        )}
      </IonContent>
    </IonPage>
  );
};

export default PushTest;
