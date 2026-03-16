/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect } from "react";
import { Camera, CameraResultType } from "@capacitor/camera";

import React, { useState } from "react";
import { IonPage, IonContent } from "@ionic/react";
import styles from "./Profile.module.css";
import noprofile from "./nop.png";
import { useHistory } from "react-router-dom";
import FullScreenLoader from "../components/FullScreenLoader";

import tokenStorage from "../utils/tokenStorage";
import { saveUser, setCurrentUser } from "../utils/authStorage";
import * as api from "../utils/apiAuth";

const Profile: React.FC = () => {
  const [editing, setEditing] = useState<
    "firstName" | "lastName" | "phone" | "email" | null
  >(null);

  const history = useHistory();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");

  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [tempProfileImage, setTempProfileImage] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const [tempValue, setTempValue] = useState("");
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [otp, setOtp] = useState("");
  const [otpError, setOtpError] = useState<string | null>(null);
  const [encryptedEmail, setEncryptedEmail] = useState<string | null>(null);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [resendTimer, setResendTimer] = useState(60);
  const otpInputRefs = React.useRef<Array<HTMLInputElement | null>>([]);
  const [canResend, setCanResend] = useState(false);
  const handleUpdate = async (
    field: "firstName" | "lastName" | "phone" | "email",
  ) => {
    try {
      const userId = await tokenStorage.getItem("user_id");
      const token = await tokenStorage.getToken();

      if (!userId || !token) return;
      const body: Partial<{
        firstName: string;
        lastName: string;
        phone: string;
        email: string;
      }> = {};

      if (field === "firstName") body.firstName = tempValue;
      if (field === "lastName") body.lastName = tempValue;
      if (field === "phone") body.phone = tempValue;
      if (field === "email") body.email = tempValue;

      const authFetch = async (input: RequestInfo, init?: RequestInit): Promise<Response> => {
        const url = typeof input === "string" ? input : (input as Request).url;
        const headers: Record<string, string> = {};
        if (init && init.headers) {
          if ((init.headers as Headers) instanceof Headers) {
            (init.headers as Headers).forEach((v, k) => (headers[k] = v));
          } else if (Array.isArray(init.headers)) {
            (init.headers as [string, string][]).forEach(([k, v]) => (headers[k] = v));
          } else {
            Object.assign(headers, init.headers as Record<string, string>);
          }
        }
  try { const token = await tokenStorage.getToken(); if (token) headers["Authorization"] = `JWT ${token}`; } catch (e) { console.warn(e); }
        const res = await fetch(url, { ...(init || {}), headers });
        if (res.status === 401) {
          try { await tokenStorage.clearToken(); } catch (e) { console.warn(e); }
          try { if (!window.location.pathname.startsWith('/auth')) window.location.assign('/auth'); } catch (e) { console.warn(e); }
        }
        return res;
      };

      const res = await authFetch(
        `${api.API_BASE.replace("/api", "")}/api/users/${userId}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
        },
      );

      if (!res.ok) throw new Error("Update failed");

      const updatedServerUser = await res.json();
      const serverData = updatedServerUser?.doc || updatedServerUser;

      if (field === "firstName") {
        setFirstName(serverData?.firstName ?? tempValue);
      }
      if (field === "lastName") {
        setLastName(serverData?.lastName ?? tempValue);
      }

      if (field === "phone") {
        setPhone(serverData?.phone ?? tempValue);
      }
      if (field === "email") {
        setEmail(serverData?.email ?? tempValue);
      }

      const updatedUser = {
        id: serverData?.id,
        email: serverData?.email ?? email,
        firstName: serverData?.firstName ?? firstName,
        lastName: serverData?.lastName ?? lastName,
        mobile: serverData?.phone ?? phone,
        gender: serverData?.gender,
      };

      saveUser(updatedUser);
      setCurrentUser(updatedUser);

      setEditing(null);
    } catch (err) {
      console.error("Update error:", err);
    }
  };

  const handleCancel = () => {
    setEditing(null);
    setTempValue("");
  };
  useEffect(() => {
    const loadProfile = async () => {
      try {
   
        const token = await tokenStorage.getToken();
        if (!token) {
          console.log("Token missing, redirecting");
          history.replace("/auth");
          return;
        }

        let userId = await tokenStorage.getItem("user_id");
        if (!userId) {
          // Try to read the synchronized user from authStorage (localStorage)
          try {
            const { getCurrentUser, hydrateCurrentUser } = await import(
              "../utils/authStorage"
            );
            const current = getCurrentUser();
            if (current?.id) userId = current.id;
            else {
              const hydrated = await hydrateCurrentUser();
              if (hydrated?.id) userId = hydrated.id;
            }
          } catch {
            // ignore
          }
        }

        if (!userId) {
          console.warn(
            "User id unavailable but token present; skipping profile fetch until hydration completes",
          );
          setLoading(false);
          return;
        }

        const serverUser = (await api.getUserById(userId as string)) as {
          id: string;
          email: string;
          firstName?: string;
          lastName?: string;
          phone?: string;
          gender?: string;
          profileImage?: { url?: string };
        };
        setFirstName(serverUser.firstName || "");
        setLastName(serverUser.lastName || "");

        setPhone(serverUser.phone || "");
        setEmail(serverUser.email || "");
        if (serverUser.profileImage?.url) {
          const fullUrl = `${api.API_BASE.replace("/api", "")}${
            serverUser.profileImage.url
          }`;

          setProfileImage(fullUrl);
        }
        const updatedUser = {
          id: serverUser.id,
          email: serverUser.email,
          firstName: serverUser.firstName,
          lastName: serverUser.lastName,
          mobile: serverUser.phone,
          gender: serverUser.gender,
        };

        saveUser(updatedUser);
        setCurrentUser(updatedUser);
      } catch (err) {
        console.error("Profile load failed", err);
        history.replace("/auth");
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [history]);
  const handleImagePick = async () => {
    try {
      const photo = await Camera.getPhoto({
        quality: 85,
        allowEditing: true,
        resultType: CameraResultType.Uri,
      });

      if (!photo.webPath) return;
      // Don't upload immediately — keep a temporary preview and show Save
      // action. The user must click Save to actually upload.
      setTempProfileImage(photo.webPath);
    } catch (err) {
      console.error("Image upload error:", err);
    }
  };

  const uploadProfileImage = async () => {
    if (!tempProfileImage) return;
    if (uploading) return;

    try {
      let blob: Blob;

      // If the preview is a data URL (web), convert it to a Blob manually.
      if (tempProfileImage.startsWith("data:")) {
        const parts = tempProfileImage.split(",");
        const meta = parts[0];
        const base64 = parts[1];
        const match = meta.match(/data:(.*);base64/);
        const mime = match ? match[1] : "image/jpeg";
        const byteString = atob(base64);
        const ab = new ArrayBuffer(byteString.length);
        const ia = new Uint8Array(ab);
        for (let i = 0; i < byteString.length; i++) ia[i] = byteString.charCodeAt(i);
        blob = new Blob([ab], { type: mime });
      } else {
        const response = await fetch(tempProfileImage);
        blob = await response.blob();
      }

      // Convert blob to base64 data URL and ensure it meets server limits (100KB)
      const MAX_SIZE = 100 * 1024; // 100KB per server

          const blobToDataURL = (b: Blob): Promise<string> =>
            new Promise((res, rej) => {
              const reader = new FileReader();
              reader.onloadend = () => res(reader.result as string);
              reader.onerror = rej;
              reader.readAsDataURL(b);
            });

          const compressDataUrl = async (dataUrl: string, mime: string): Promise<string> => {
            // Create an image, draw to canvas and reduce quality until under MAX_SIZE
            return new Promise((resolve) => {
              const img = new Image();
              img.onload = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                if (!ctx) return resolve(dataUrl);

                // scale to <= 1024 width/height to avoid huge images
                const maxDim = 1024;
                let { width, height } = img;
                if (width > maxDim || height > maxDim) {
                  const ratio = Math.min(maxDim / width, maxDim / height);
                  width = Math.round(width * ratio);
                  height = Math.round(height * ratio);
                }
                canvas.width = width;
                canvas.height = height;
                ctx.drawImage(img, 0, 0, width, height);

                let quality = 0.92;
                const tryExport = () => {
                  const out = canvas.toDataURL(mime, quality);
                  // approximate size of base64 payload
                  const size = Math.ceil((out.length - out.indexOf(',') - 1) * 3 / 4);
                  if (size <= MAX_SIZE || quality <= 0.4) return resolve(out);
                  quality -= 0.08;
                  requestAnimationFrame(tryExport);
                };
                tryExport();
              };
              img.onerror = () => resolve(dataUrl);
              img.src = dataUrl;
            });
          };

          let dataUrl = await blobToDataURL(blob);
          // choose a sensible mime for compression
          const preferMime = blob.type || 'image/jpeg';
          if (dataUrl.length > MAX_SIZE) {
            dataUrl = await compressDataUrl(dataUrl, preferMime.startsWith('image/') ? preferMime : 'image/jpeg');
          }

          // Final size check
          const approxSize = Math.ceil((dataUrl.length - dataUrl.indexOf(',') - 1) * 3 / 4);
          if (approxSize > MAX_SIZE) {
            console.error('Image still too large after compression:', approxSize);
            throw new Error('Image exceeds size limit after compression');
          }

          const token = await tokenStorage.getToken();
          const userId = await tokenStorage.getItem('user_id');
          if (!token || !userId) throw new Error('Auth missing');

          const authFetch = async (input: RequestInfo, init?: RequestInit): Promise<Response> => {
            const url = typeof input === 'string' ? input : (input as Request).url;
            const headers: Record<string, string> = {};
            if (init && init.headers) {
              if ((init.headers as Headers) instanceof Headers) {
                (init.headers as Headers).forEach((v, k) => (headers[k] = v));
              } else if (Array.isArray(init.headers)) {
                (init.headers as [string, string][]).forEach(([k, v]) => (headers[k] = v));
              } else {
                Object.assign(headers, init.headers as Record<string, string>);
              }
            }
            try { const token = await tokenStorage.getToken(); if (token) headers['Authorization'] = `JWT ${token}`; } catch (e) { console.warn(e); }
            const res = await fetch(url, { ...(init || {}), headers });
            if (res.status === 401) {
              try { await tokenStorage.clearToken(); } catch (e) { console.warn(e); }
              try { if (!window.location.pathname.startsWith('/auth')) window.location.assign('/auth'); } catch (e) { console.warn(e); }
            }
            return res;
          };

          setUploading(true);

          // Send to custom endpoint that accepts base64 JSON
          const uploadUrl = `${api.API_BASE.replace('/api', '')}/api/users/upload-profile-image`;
          // Choose filename + alt
          const ext = (preferMime.split('/')[1] || 'jpg').replace(/[^a-z0-9]/gi, '');
          const filename = `profile-${userId}-${Date.now()}.${ext}`;
          const alt = filename; // use filename as alt text for accessibility/SEO

          const uploadRes = await authFetch(uploadUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ base64: dataUrl, filename, alt, mimetype: preferMime }),
          });

          const uploadText = await uploadRes.text();
          console.log('Upload response status:', uploadRes.status, 'body:', uploadText);

          if (!uploadRes.ok) {
            let parsed: any = uploadText;
            try { parsed = JSON.parse(uploadText); } catch { console.warn('Failed to parse upload response'); }
            console.error('Upload failed:', uploadRes.status, parsed);
            setUploadError(parsed?.error || parsed?.message || 'Upload failed');
            throw new Error('Upload failed');
          }

          const mediaResp = (() => { try { return JSON.parse(uploadText); } catch { return uploadText; } })();
          const mediaDoc = mediaResp?.media || mediaResp?.doc || mediaResp;

          if (mediaDoc?.url) {
            const fullUrl = `${api.API_BASE.replace('/api', '')}${mediaDoc.url}`;
            setProfileImage(fullUrl);
          }
        } catch (err) {
          console.error('Image upload error:', err);
          setUploadError(err instanceof Error ? err.message : String(err));
        } finally {
          // Clear temporary preview and uploading state
          setTempProfileImage(null);
          setUploading(false);
        }

    };

  const handleSendEmailOtp = async () => {
    try {
      setSendingOtp(true);
      setOtpError(null);

      const res = await api.changeEmailOtp(tempValue);

      setEncryptedEmail(res.email);

      setShowOtpModal(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to send OTP';
      setOtpError(message);
    } finally {
      setSendingOtp(false);
    }
    setResendTimer(60);
    setCanResend(false);
  };
  const handleResendOtp = async () => {
    if (!canResend) return;

    try {
      setCanResend(false);
      setResendTimer(60);
      await api.changeEmailOtp(tempValue);
    } catch (err) {
      console.error(err);
    }
  };
  useEffect(() => {
    let interval: any;

    if (showOtpModal && resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer((prev) => prev - 1);
      }, 1000);
    }

    if (resendTimer === 0) {
      setCanResend(true);
    }

    return () => clearInterval(interval);
  }, [showOtpModal, resendTimer]);
  const isEmailChanged =
    editing === "email" &&
    tempValue.trim() !== "" &&
    tempValue.trim() !== email;
  const handleVerifyEmailOtp = async () => {
    try {
      if (!otp || otp.length !== 4) {
        setOtpError("Enter valid 4-digit code");
        return;
      }

      setVerifyingOtp(true);
      setOtpError(null);

      if (!encryptedEmail) {
        setOtpError("Something went wrong. Please try again.");
        return;
      }

      const res = await api.verifyChangeEmail(encryptedEmail, otp);
      console.log(" OTP Verify Result:", res);
      if (res.token) {
        await tokenStorage.setToken(res.token);
      }

      const updatedUser = {
        id: res.user.id,
        email: res.user.email,
        firstName: res.user.firstName,
        lastName: res.user.lastName,
        mobile: res.user.phone ?? "",
        gender: res.user.gender,
      };

      saveUser(updatedUser);
      setCurrentUser(updatedUser);

      setEmail(res.user.email);
      setEditing(null);
      setShowOtpModal(false);
      setShowSuccessModal(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Invalid OTP";
      setOtpError(message);
    } finally {
      setVerifyingOtp(false);
    }
  };
  return (
    <IonPage>
      <IonContent fullscreen className="home-content">
        <div className={styles.Main}>
          <div className={styles.MainConatiner}>
            <div className={styles.Top}>
              <div className={styles.TopLeft} onClick={() => history.goBack()}>
                <svg width="35" height="35" viewBox="0 0 35 35" fill="none">
                  <path
                    d="M20.5 13L15 18.5L20.5 24"
                    stroke="white"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <div className={styles.TopRight}>
                <p>Profile</p>
              </div>
            </div>

            <div className={styles.Middle}>
              {loading ? (
                <FullScreenLoader />
              ) : (
                <>
                  <div className={styles.MiddleTop}>
                    <div className={styles.ProfileCircle}>
                      <img
                        src={tempProfileImage || profileImage || noprofile}
                        alt="Profile"
                        onClick={handleImagePick}
                      />
                    </div>
                  </div>
                  <div className={styles.MiddleBottom}>
                    {tempProfileImage ? (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                        <p
                          onClick={() => { if (!uploading) { setUploadError(null); uploadProfileImage(); } }}
                          style={{ margin: 0, cursor: uploading ? 'default' : 'pointer', color: uploading ? '#8C8C8C' : undefined, textDecoration: 'underline', textUnderlineOffset: 2 }}
                        >
                          {uploading ? 'Saving...' : 'Save'}
                        </p>
                        {uploadError && <p className={styles.errorText}>{uploadError}</p>}
                      </div>
                    ) : (
                      <p onClick={handleImagePick}>
                        {profileImage ? 'Change profile photo' : 'Add profile photo'}
                      </p>
                    )}
                  </div>
                </>
              )}
            </div>

            <div className={styles.Bottom}>
              <div className={styles.BottomTop}>
                <h4>Personal Info</h4>
              </div>

              <div className={styles.BottomBottom}>
                <div className={styles.InfoBlock}>
                  <div
                    className={`${styles.InfoRow} ${
                      editing === "firstName" ? styles.InfoRowActive : ""
                    }`}
                  >
                    <div className={styles.InfoLeft}>
                      <span>First Name</span>

                      {editing === "firstName" ? (
                        <input
                          value={tempValue}
                          onChange={(e) => setTempValue(e.target.value)}
                          autoFocus
                          placeholder="Add name"
                        />
                      ) : (
                        <p>{firstName || "Add first name"}</p>
                      )}
                    </div>
                    {editing !== "firstName" && (
                      <div
                        className={styles.EditIcon}
                        onClick={() => {
                          setEditing("firstName");
                          setTempValue(firstName);
                        }}
                      >
                        <svg
                          width="35"
                          height="36"
                          viewBox="0 0 35 36"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <mask
                            id="mask0_3354_4652"
                            maskUnits="userSpaceOnUse"
                            x="0"
                            y="0"
                            width="35"
                            height="36"
                          >
                            <path
                              d="M34.5 35.375V0.5H0.5V35.375H34.5Z"
                              fill="white"
                              stroke="white"
                            />
                          </mask>
                          <g mask="url(#mask0_3354_4652)">
                            <path
                              d="M24.7292 12.8829L14.2689 23.6047L11 24.2749L11.6538 20.9243L22.1141 10.2025C22.4752 9.83239 23.0606 9.83239 23.4216 10.2025L24.7292 11.5427C25.0903 11.9128 25.0903 12.5128 24.7292 12.8829Z"
                              stroke="#4B3827"
                              stroke-miterlimit="10"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                            <path
                              d="M20.8086 11.5475L23.4237 14.2279"
                              stroke="#4B3827"
                              stroke-miterlimit="10"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </g>
                        </svg>
                      </div>
                    )}
                  </div>

                  {editing === "firstName" && (
                    <div className={styles.ActionRow}>
                      <button
                        className={styles.UpdateBtn}
                        disabled={!tempValue.trim()}
                        onClick={() => handleUpdate("firstName")}
                      >
                        Update
                      </button>
                      <button
                        className={styles.CancelBtn}
                        onClick={handleCancel}
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
                <div className={styles.InfoBlock}>
                  <div
                    className={`${styles.InfoRow} ${
                      editing === "lastName" ? styles.InfoRowActive : ""
                    }`}
                  >
                    <div className={styles.InfoLeft}>
                      <span>Last Name</span>

                      {editing === "lastName" ? (
                        <input
                          value={tempValue}
                          onChange={(e) => setTempValue(e.target.value)}
                          autoFocus
                          placeholder="Add last name"
                        />
                      ) : (
                        <p>{lastName || "Add last name"}</p>
                      )}
                    </div>

                    {editing !== "lastName" && (
                      <div
                        className={styles.EditIcon}
                        onClick={() => {
                          setEditing("lastName");
                          setTempValue(lastName);
                        }}
                      >
                        <svg
                          width="35"
                          height="36"
                          viewBox="0 0 35 36"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <mask
                            id="mask0_3354_4652"
                            maskUnits="userSpaceOnUse"
                            x="0"
                            y="0"
                            width="35"
                            height="36"
                          >
                            <path
                              d="M34.5 35.375V0.5H0.5V35.375H34.5Z"
                              fill="white"
                              stroke="white"
                            />
                          </mask>
                          <g mask="url(#mask0_3354_4652)">
                            <path
                              d="M24.7292 12.8829L14.2689 23.6047L11 24.2749L11.6538 20.9243L22.1141 10.2025C22.4752 9.83239 23.0606 9.83239 23.4216 10.2025L24.7292 11.5427C25.0903 11.9128 25.0903 12.5128 24.7292 12.8829Z"
                              stroke="#4B3827"
                              stroke-miterlimit="10"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                            <path
                              d="M20.8086 11.5475L23.4237 14.2279"
                              stroke="#4B3827"
                              stroke-miterlimit="10"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </g>
                        </svg>
                      </div>
                    )}
                  </div>

                  {editing === "lastName" && (
                    <div className={styles.ActionRow}>
                      <button
                        className={styles.UpdateBtn}
                        disabled={!tempValue.trim()}
                        onClick={() => handleUpdate("lastName")}
                      >
                        Update
                      </button>
                      <button
                        className={styles.CancelBtn}
                        onClick={handleCancel}
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>

                <div className={styles.InfoBlock}>
                  <div
                    className={`${styles.InfoRow} ${
                      editing === "phone" ? styles.InfoRowActive : ""
                    }`}
                  >
                    <div className={styles.InfoLeft}>
                      <span>Phone Number</span>
                      {editing === "phone" ? (
                        <input
                          value={tempValue}
                          onChange={(e) => setTempValue(e.target.value)}
                          autoFocus
                          placeholder="Add phone number"
                        />
                      ) : (
                        <p>{phone || "Add phone number"}</p>
                      )}
                    </div>

                    {editing !== "phone" && (
                      <div
                        className={styles.EditIcon}
                        onClick={() => {
                          setEditing("phone");
                          setTempValue(phone);
                        }}
                      >
                        <svg
                          width="35"
                          height="36"
                          viewBox="0 0 35 36"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <mask
                            id="mask0_3354_4652"
                            maskUnits="userSpaceOnUse"
                            x="0"
                            y="0"
                            width="35"
                            height="36"
                          >
                            <path
                              d="M34.5 35.375V0.5H0.5V35.375H34.5Z"
                              fill="white"
                              stroke="white"
                            />
                          </mask>
                          <g mask="url(#mask0_3354_4652)">
                            <path
                              d="M24.7292 12.8829L14.2689 23.6047L11 24.2749L11.6538 20.9243L22.1141 10.2025C22.4752 9.83239 23.0606 9.83239 23.4216 10.2025L24.7292 11.5427C25.0903 11.9128 25.0903 12.5128 24.7292 12.8829Z"
                              stroke="#4B3827"
                              stroke-miterlimit="10"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                            <path
                              d="M20.8086 11.5475L23.4237 14.2279"
                              stroke="#4B3827"
                              stroke-miterlimit="10"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </g>
                        </svg>
                      </div>
                    )}
                  </div>

                  {editing === "phone" && (
                    <div className={styles.ActionRow}>
                      <button
                        className={styles.UpdateBtn}
                        disabled={!tempValue.trim()}
                        onClick={() => handleUpdate("phone")}
                      >
                        Update
                      </button>
                      <button
                        className={styles.CancelBtn}
                        onClick={handleCancel}
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>

                <div className={styles.InfoBlock}>
                  <div
                    className={`${styles.InfoRow} ${
                      editing === "email" ? styles.InfoRowActive : ""
                    }`}
                  >
                    <div className={styles.InfoLeft}>
                      <span>Email</span>
                      {editing === "email" ? (
                        <input
                          value={tempValue}
                          onChange={(e) => setTempValue(e.target.value)}
                          autoFocus
                          placeholder="Add email address"
                        />
                      ) : (
                        <p>{email || "Add email address"}</p>
                      )}
                    </div>

                    {editing !== "email" && (
                      <div
                        className={styles.EditIcon}
                        onClick={() => {
                          setEditing("email");
                          setTempValue(email);
                        }}
                      >
                        <svg
                          width="35"
                          height="36"
                          viewBox="0 0 35 36"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <mask
                            id="mask0_3354_4652"
                            maskUnits="userSpaceOnUse"
                            x="0"
                            y="0"
                            width="35"
                            height="36"
                          >
                            <path
                              d="M34.5 35.375V0.5H0.5V35.375H34.5Z"
                              fill="white"
                              stroke="white"
                            />
                          </mask>
                          <g mask="url(#mask0_3354_4652)">
                            <path
                              d="M24.7292 12.8829L14.2689 23.6047L11 24.2749L11.6538 20.9243L22.1141 10.2025C22.4752 9.83239 23.0606 9.83239 23.4216 10.2025L24.7292 11.5427C25.0903 11.9128 25.0903 12.5128 24.7292 12.8829Z"
                              stroke="#4B3827"
                              stroke-miterlimit="10"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                            <path
                              d="M20.8086 11.5475L23.4237 14.2279"
                              stroke="#4B3827"
                              stroke-miterlimit="10"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </g>
                        </svg>
                      </div>
                    )}
                  </div>

                  {editing === "email" && (
                    <div className={styles.ActionRow}>
                      <button
                        className={styles.UpdateBtn}
                        disabled={!isEmailChanged || sendingOtp}
                        onClick={handleSendEmailOtp}
                      >
                        {sendingOtp ? "Sending..." : "Verify"}
                      </button>
                      <button
                        className={styles.CancelBtn}
                        onClick={handleCancel}
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </IonContent>
      {showOtpModal && (
        <div
          className={styles.modalOverlay}
          onClick={() => { setShowOtpModal(false); setOtp(""); setOtpError(null); }}
        >
          <div className={styles.otpCard} onClick={(e) => e.stopPropagation()}>
            <h3 className={styles.otpTitle}>Verify your email address</h3>

            <p className={styles.otpSubtitle}>
              Enter the 4-digit code sent to{" "}
              <span className={styles.otpEmail}>{tempValue}</span>
              <span
                className={styles.editEmailIcon}
                onClick={() => {
                  setShowOtpModal(false);
                  setEditing("email");
                }}
              >
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 12 12"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M6 1.5H2.5C2.23478 1.5 1.98043 1.60536 1.79289 1.79289C1.60536 1.98043 1.5 2.23478 1.5 2.5V9.5C1.5 9.76522 1.60536 10.0196 1.79289 10.2071C1.98043 10.3946 2.23478 10.5 2.5 10.5H9.5C9.76522 10.5 10.0196 10.3946 10.2071 10.2071C10.3946 10.0196 10.5 9.76522 10.5 9.5V6"
                    stroke="#4B3827"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M9.1895 1.31066C9.38841 1.11175 9.6582 1 9.9395 1C10.2208 1 10.4906 1.11175 10.6895 1.31066C10.8884 1.50957 11.0002 1.77936 11.0002 2.06066C11.0002 2.34196 10.8884 2.61175 10.6895 2.81066L6.183 7.31766C6.06427 7.43628 5.9176 7.52312 5.7565 7.57016L4.32 7.99016C4.27698 8.00271 4.23137 8.00346 4.18795 7.99234C4.14454 7.98122 4.10491 7.95863 4.07322 7.92694C4.04153 7.89525 4.01894 7.85562 4.00782 7.81221C3.9967 7.76879 3.99745 7.72318 4.01 7.68016L4.43 6.24366C4.47726 6.08269 4.56427 5.93619 4.683 5.81766L9.1895 1.31066Z"
                    stroke="#4B3827"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
            </p>

            <div className={styles.otpInputWrapper}>
              {[0, 1, 2, 3].map((index) => (
                <input
                  key={index}
                  ref={(el) => { otpInputRefs.current[index] = el; }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={otp[index] || ""}
                  onChange={(e) => {
                    const value = e.target.value.replace(/[^0-9]/g, "").slice(-1);
                    const newOtp =
                      otp.substring(0, index) +
                      value +
                      otp.substring(index + 1);
                    setOtp(newOtp);
                    if (value && index < 3) {
                      otpInputRefs.current[index + 1]?.focus();
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Backspace" && !otp[index] && index > 0) {
                      otpInputRefs.current[index - 1]?.focus();
                    }
                  }}
                  className={`${styles.otpInput} ${otp[index] ? styles.otpInputFilled : ""}`}
                />
              ))}
            </div>

            {otpError && <p className={styles.errorText}>{otpError}</p>}

            <button
              className={styles.confirmBtn}
              onClick={handleVerifyEmailOtp}
              disabled={verifyingOtp || otp.length < 4}
            >
              {verifyingOtp ? "Verifying..." : "Confirm"}
            </button>

            <p className={styles.resendText}>
              Didn&apos;t receive it? Check spam or
            </p>
            <div className={styles.resendTimerRow}>
              {canResend ? (
                <button className={styles.resendActive} onClick={handleResendOtp}>
                  Resend OTP
                </button>
              ) : (
                <span className={styles.resendCountdown}>
                  Resend OTP ({Math.floor(resendTimer / 60).toString().padStart(2, "0")}:{(resendTimer % 60).toString().padStart(2, "0")})
                </span>
              )}
            </div>
          </div>
        </div>
      )}
      {showSuccessModal && (
        <div className={styles.modalOverlay} onClick={() => setShowSuccessModal(false)}>
          <div className={styles.successCard} onClick={(e) => e.stopPropagation()}>
            <div className={styles.successIcon}>
              <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="16" cy="16" r="16" fill="#6C7A57" fillOpacity="0.12"/>
                <path d="M9 16.5L13.5 21L23 11" stroke="#6C7A57" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>

            <h3 className={styles.successTitle}>OTP Verified</h3>

            <p className={styles.successSubtitle}>
              Your email address has been successfully verified.
            </p>

            <button
              className={styles.doneBtn}
              onClick={() => setShowSuccessModal(false)}
            >
              Done
            </button>
          </div>
        </div>
      )}
    </IonPage>
  );
};

export default Profile;
