import React, { useEffect } from "react";
import { SocialLogin, ProviderResponseMap } from "@capgo/capacitor-social-login";
import { IonButton } from "@ionic/react";
import { Capacitor } from "@capacitor/core";

interface AppleLoginProps {
  onSuccess: (result: ProviderResponseMap["apple"]) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onFailure: (error: any) => void;
}

const AppleLoginButton: React.FC<AppleLoginProps> = ({ onSuccess, onFailure }) => {
  useEffect(() => {
    const init = async () => {
      try {
        const isAndroid = Capacitor.getPlatform() === "android";
        await SocialLogin.initialize({
          apple: isAndroid
            ? {
                clientId: "com.whitemantis.app.ios",
                redirectUrl: "https://whitemantis.ae/api/app/apple-auth-android-callback",
              }
            : {
                clientId: "com.whitemantis.appname",
              },
        });
      } catch (err) {
        console.error("Apple auth init failed", err);
      }
    };
    init();
  }, []);

  const handleLogin = async () => {
    try {
      const response = await SocialLogin.login({
        provider: "apple",
        options: {
          scopes: ["email", "name"],
        },
      });
      onSuccess(response.result);
    } catch (err) {
      onFailure(err);
    }
  };

  return (
    <IonButton
      expand="block"
      onClick={handleLogin}
      style={{
        "--background": "#ffff",
        "--color": "#6C7A5F",
        "--border-color": "#6C7A5F80",
        "--border-style": "solid",
        "--border-width": "1px",
        "--box-shadow": "none",
        "--border-radius": "8px",
        fontWeight: 500,
        fontSize: "14px",
        fontFamily: "var(--lato)",
      }}
    >
      <span style={{ display: "flex", alignItems: "center", gap: "12px" }}>
       <svg width="19" height="24" viewBox="0 0 19 24" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M16.7324 21.0024C15.7969 22.4906 14.8051 23.9428 13.2948 23.9668C11.7845 24.0028 11.2998 23.0186 9.58663 23.0186C7.86217 23.0186 7.33243 23.9428 5.90102 24.0028C4.42452 24.0628 3.3087 22.4186 2.36193 20.9664C0.434598 18.0021 -1.0419 12.5414 0.941791 8.86902C1.92237 7.04481 3.68064 5.89268 5.58543 5.85667C7.02812 5.83267 8.40318 6.90079 9.29358 6.90079C10.1727 6.90079 11.8408 5.61665 13.5878 5.80867C14.3204 5.84467 16.3718 6.1207 17.6905 8.18494C17.589 8.25695 15.2447 9.72112 15.2672 12.7575C15.301 16.3819 18.254 17.594 18.2878 17.606C18.254 17.69 17.8144 19.3342 16.7324 21.0024ZM10.2967 1.80021C11.1195 0.804092 12.4833 0.0480055 13.6104 0C13.7569 1.40416 13.2272 2.82032 12.4382 3.82844C11.6605 4.84856 10.3756 5.64065 9.11325 5.53264C8.94418 4.15248 9.57536 2.71231 10.2967 1.80021Z" fill="black"/>
</svg>

        <span style={{ textTransform: "none" }}>Sign in with Apple</span>
      </span>
    </IonButton>
  );
};

export default AppleLoginButton;
