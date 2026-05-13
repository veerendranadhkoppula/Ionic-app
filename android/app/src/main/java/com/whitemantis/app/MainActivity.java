package com.whitemantis.app;

import android.content.Intent;
import android.net.Uri;
import android.os.Handler;
import android.os.Looper;
import com.getcapacitor.BridgeActivity;
import org.json.JSONObject;

public class MainActivity extends BridgeActivity {
    private volatile String pendingDeepLinkUrl = null;

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);

        Uri data = intent.getData();
        String urlStr = data != null ? data.toString() : null;
        android.util.Log.d("WhitemantisApp", "[onNewIntent] data=" + (urlStr != null ? urlStr.substring(0, Math.min(120, urlStr.length())) : "null"));
        pendingDeepLinkUrl = urlStr;
    }

    @Override
    public void onResume() {
        super.onResume(); // super call resumes WebView JS engine via bridge.onResume()
        final String url = pendingDeepLinkUrl;
        if (url != null) {
            pendingDeepLinkUrl = null;
            // Small delay after JS engine resumes before dispatching event
            new Handler(Looper.getMainLooper()).postDelayed(() -> dispatchUrlToJs(url), 300);
        }
    }

    private void dispatchUrlToJs(String url) {
        if (url == null || getBridge() == null || getBridge().getWebView() == null) {
            android.util.Log.e("WhitemantisApp", "[dispatchUrlToJs] bridge or webview is null");
            return;
        }
        try {
            JSONObject detail = new JSONObject();
            detail.put("url", url);
            final String js = "window.dispatchEvent(new CustomEvent('nativeAppUrlOpen',{detail:" + detail.toString() + "}));";
            android.util.Log.d("WhitemantisApp", "[dispatchUrlToJs] evaluating JS for url=" + url.substring(0, Math.min(80, url.length())));
            getBridge().getWebView().evaluateJavascript(js, value ->
                android.util.Log.d("WhitemantisApp", "[dispatchUrlToJs] JS result=" + value)
            );
        } catch (Exception e) {
            android.util.Log.e("WhitemantisApp", "[dispatchUrlToJs] exception: " + e.getMessage());
        }
    }
}
