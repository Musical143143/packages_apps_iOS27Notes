package com.rayan.ios27notes;

import android.app.Activity;
import android.os.Bundle;
import android.view.Window;
import android.view.WindowManager;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

public class MainActivity extends Activity {
    private WebView myWebView;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        requestWindowFeature(Window.FEATURE_NO_TITLE);
        getWindow().setFlags(WindowManager.LayoutParams.FLAG_FULLSCREEN, 
                            WindowManager.LayoutParams.FLAG_FULLSCREEN);

        myWebView = new WebView(this);
        WebSettings webSettings = myWebView.getSettings();
        
        // Performance & Local Persistence optimizations
        webSettings.setJavaScriptEnabled(true);
        webSettings.setDomStorageEnabled(true); 
        webSettings.setDatabaseEnabled(true);
        webSettings.setAllowFileAccess(true);
        webSettings.setAllowContentAccess(true);

        myWebView.setWebViewClient(new WebViewClient());
        myWebView.loadUrl("file:///android_asset/www/index.html");
        setContentView(myWebView);
    }

    @Override
    public void onBackPressed() {
        if (myWebView.canGoBack()) {
            myWebView.goBack();
        } else {
            super.onBackPressed();
        }
    }
}
