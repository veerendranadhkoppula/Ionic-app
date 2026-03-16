import React, { useEffect } from "react";
import {
  SocialLogin,
  ProviderResponseMap,
} from "@capgo/capacitor-social-login";
import { IonButton } from "@ionic/react";

interface GoogleLoginProps {
  onSuccess: (user: ProviderResponseMap["google"]) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onFailure: (error: any) => void;
}

const GoogleLoginButton: React.FC<GoogleLoginProps> = ({
  onSuccess,
  onFailure,
}) => {
  useEffect(() => {
    const init = async () => {
      try {
        await SocialLogin.initialize({
          google: {
            webClientId:
              "134359262850-c4g1hsnecjtkc7f2kr2l4q1j0gpqcrog.apps.googleusercontent.com",
            mode: "online",
          },
        });
      } catch (err) {
        console.error("Auth init failed", err);
      }
    };

    init();
  }, []);

  const handleLogin = async () => {
    try {
      const response = await SocialLogin.login({
        provider: "google",
        options: {},
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
        "--background": "#ffffff",
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
      {/* Google SVG */}
      <span style={{ display: "flex", alignItems: "center", gap: "12px" }}>
        <svg
          width="20"
          height="20"
          viewBox="0 0 20 20"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <g clip-path="url(#clip0_1911_3265)">
            <path
              d="M19.9905 10.1871C19.9905 9.36767 19.9224 8.76973 19.7752 8.14966H10.1992V11.848H15.8201C15.7068 12.7671 15.0948 14.1512 13.7349 15.0813L13.7159 15.2051L16.7436 17.4969L16.9534 17.5174C18.8798 15.7789 19.9905 13.221 19.9905 10.1871Z"
              fill="#4285F4"
            />
            <path
              d="M10.1992 19.9312C12.953 19.9312 15.2648 19.0453 16.9534 17.5173L13.7349 15.0812C12.8737 15.6681 11.7177 16.0777 10.1992 16.0777C7.50211 16.0777 5.21297 14.3393 4.39695 11.9365L4.27734 11.9464L1.12906 14.3271L1.08789 14.439C2.76508 17.6944 6.21016 19.9312 10.1992 19.9312Z"
              fill="#34A853"
            />
            <path
              d="M4.39695 11.9366C4.18164 11.3165 4.05703 10.6521 4.05703 9.96559C4.05703 9.27902 4.18164 8.61467 4.38562 7.9946L4.37992 7.86253L1.19219 5.4436L1.08789 5.49208C0.396641 6.84299 0 8.36002 0 9.96559C0 11.5712 0.396641 13.0881 1.08789 14.439L4.39695 11.9366Z"
              fill="#FBBC05"
            />
            <path
              d="M10.1992 3.85336C12.1144 3.85336 13.4063 4.66168 14.1429 5.33717L17.0213 2.59107C15.2535 0.985496 12.953 0 10.1992 0C6.21016 0 2.76508 2.23672 1.08789 5.49214L4.38563 7.99466C5.21297 5.59183 7.50211 3.85336 10.1992 3.85336Z"
              fill="#EB4335"
            />
          </g>
          <defs>
            <clipPath id="clip0_1911_3265">
              <rect width="20" height="20" fill="white" />
            </clipPath>
          </defs>
        </svg>

        <span style={{ textTransform: "none" }}>Sign in with Google</span>
      </span>
    </IonButton>
  );
};

export default GoogleLoginButton;
