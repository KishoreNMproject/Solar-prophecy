package app.solarprophecy;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.app.DownloadManager;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.database.Cursor;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Environment;
import android.webkit.JavascriptInterface;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;

import androidx.core.content.FileProvider;

import androidx.webkit.WebViewAssetLoader;
import androidx.webkit.ServiceWorkerClientCompat;
import androidx.webkit.ServiceWorkerControllerCompat;

import java.io.File;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;
import java.util.Timer;
import java.util.TimerTask;
import android.util.Log;
import android.graphics.Color;
import android.view.Window;
import android.view.WindowManager;
import android.view.View;
import com.google.android.gms.auth.api.signin.GoogleSignIn;
import com.google.android.gms.auth.api.signin.GoogleSignInAccount;
import com.google.android.gms.auth.api.signin.GoogleSignInClient;
import com.google.android.gms.auth.api.signin.GoogleSignInOptions;
import com.google.android.gms.common.api.Scope;
import com.google.android.gms.tasks.Task;
import com.google.android.gms.common.api.ApiException;
import com.google.android.gms.auth.GoogleAuthUtil;
import java.util.concurrent.Executors;

public class MainActivity extends Activity {
    private static final String TAG = "SolarProphecyOTA";
    private static final int CREATE_FILE_REQUEST_CODE = 1;
    private static final int FILE_CHOOSER_REQUEST_CODE = 2;
    private WebView webView;
    private WebViewAssetLoader assetLoader;
    private String pendingBackupJson;
    private ValueCallback<Uri[]> mFilePathCallback;
    private DownloadManager downloadManager;
    private long downloadId = -1;
    private Timer progressTimer;
    private static final int RC_SIGN_IN = 9001;
    private GoogleSignInClient mGoogleSignInClient;

    @Override
    @SuppressLint("SetJavaScriptEnabled")
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Clean up any previously downloaded OTA updates
        try {
            java.io.File downloadDir = getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS);
            if (downloadDir != null && downloadDir.exists() && downloadDir.isDirectory()) {
                java.io.File[] files = downloadDir.listFiles();
                if (files != null) {
                    for (java.io.File file : files) {
                        if (file.isFile() && file.getName().endsWith(".apk")) {
                            boolean deleted = file.delete();
                            Log.i(TAG, "Startup Cleanup: Deleted old APK " + file.getName() + " -> " + deleted);
                        }
                    }
                }
            }
        } catch (Exception e) {
            Log.e(TAG, "Failed to clean up old OTA files on startup", e);
        }

        assetLoader = new WebViewAssetLoader.Builder()
                .addPathHandler("/assets/", new WebViewAssetLoader.AssetsPathHandler(this))
                .build();

        webView = new WebView(this);
        webView.setWebViewClient(new WebViewClient() {
            @Override
            public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                return assetLoader.shouldInterceptRequest(request.getUrl());
            }

            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                String url = request.getUrl().toString();
                if (url.startsWith("upi://") || url.startsWith("intent://")) {
                    try {
                        Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
                        startActivity(intent);
                        return true;
                    } catch (Exception e) {
                        Log.e(TAG, "Failed to launch intent: " + url, e);
                        Toast.makeText(MainActivity.this, "No app found to handle this payment link.", Toast.LENGTH_SHORT).show();
                        return true;
                    }
                }
                return false;
            }
        });
        
        ServiceWorkerControllerCompat swController = ServiceWorkerControllerCompat.getInstance();
        swController.setServiceWorkerClient(new ServiceWorkerClientCompat() {
            @Override
            public WebResourceResponse shouldInterceptRequest(WebResourceRequest request) {
                return assetLoader.shouldInterceptRequest(request.getUrl());
            }
        });
        
        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public boolean onShowFileChooser(WebView webView, ValueCallback<Uri[]> filePathCallback, FileChooserParams fileChooserParams) {
                if (mFilePathCallback != null) {
                    mFilePathCallback.onReceiveValue(null);
                }
                mFilePathCallback = filePathCallback;

                Intent intent = fileChooserParams.createIntent();
                try {
                    startActivityForResult(intent, FILE_CHOOSER_REQUEST_CODE);
                } catch (Exception e) {
                    mFilePathCallback = null;
                    Toast.makeText(MainActivity.this, "Failed to open file picker", Toast.LENGTH_SHORT).show();
                    return false;
                }
                return true;
            }
        });

        webView.addJavascriptInterface(new SolarAndroidBridge(), "SolarAndroid");

        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(false);

        setContentView(webView);
        webView.loadUrl("https://appassets.androidplatform.net/assets/www/index.html");

        downloadManager = (DownloadManager) getSystemService(Context.DOWNLOAD_SERVICE);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            registerReceiver(onDownloadComplete, new IntentFilter(DownloadManager.ACTION_DOWNLOAD_COMPLETE), Context.RECEIVER_EXPORTED);
        } else {
            registerReceiver(onDownloadComplete, new IntentFilter(DownloadManager.ACTION_DOWNLOAD_COMPLETE));
        }
    }

    @Override
    protected void onDestroy() {
        super.onDestroy();
        unregisterReceiver(onDownloadComplete);
        stopProgressTimer();
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        
        if (requestCode == RC_SIGN_IN) {
            Task<GoogleSignInAccount> task = GoogleSignIn.getSignedInAccountFromIntent(data);
            handleSignInResult(task);
            return;
        }
        
        if (requestCode == CREATE_FILE_REQUEST_CODE) {
            if (resultCode == RESULT_OK && data != null) {
                Uri uri = data.getData();
                if (uri != null && pendingBackupJson != null) {
                    saveToUri(uri, pendingBackupJson);
                }
            }
            pendingBackupJson = null;
        } else if (requestCode == FILE_CHOOSER_REQUEST_CODE) {
            if (mFilePathCallback == null) return;
            Uri[] results = null;
            if (resultCode == RESULT_OK && data != null) {
                String dataString = data.getDataString();
                if (dataString != null) {
                    results = new Uri[]{Uri.parse(dataString)};
                } else if (data.getClipData() != null) {
                    int count = data.getClipData().getItemCount();
                    results = new Uri[count];
                    for (int i = 0; i < count; i++) {
                        results[i] = data.getClipData().getItemAt(i).getUri();
                    }
                }
            }
            mFilePathCallback.onReceiveValue(results);
            mFilePathCallback = null;
        }
    }

    private void saveToUri(Uri uri, String json) {
        try (OutputStream outputStream = getContentResolver().openOutputStream(uri)) {
            if (outputStream != null) {
                outputStream.write(json.getBytes(StandardCharsets.UTF_8));
                Toast.makeText(this, "Backup saved successfully", Toast.LENGTH_LONG).show();
            }
        } catch (Exception e) {
            Toast.makeText(this, "Failed to save backup: " + e.getMessage(), Toast.LENGTH_LONG).show();
        }
    }

    private void handleSignInResult(Task<GoogleSignInAccount> completedTask) {
        try {
            GoogleSignInAccount account = completedTask.getResult(ApiException.class);
            String email = account.getEmail();
            String name = account.getDisplayName();
            String photoUrl = account.getPhotoUrl() != null ? account.getPhotoUrl().toString() : "";
            String subjectId = account.getId();
            
            Executors.newSingleThreadExecutor().execute(() -> {
                try {
                    String scope = "oauth2:https://www.googleapis.com/auth/drive.appdata";
                    String accessToken = GoogleAuthUtil.getToken(MainActivity.this, account.getAccount(), scope);
                    
                    runOnUiThread(() -> {
                        String js = String.format("window.onNativeOAuthSuccess('%s', '%s', '%s', '%s', '%s');",
                            accessToken, email != null ? email : "", name != null ? name : "", photoUrl, subjectId != null ? subjectId : "");
                        webView.evaluateJavascript(js, null);
                    });
                } catch (Exception authEx) {
                    Log.e(TAG, "Failed to get access token", authEx);
                    runOnUiThread(() -> webView.evaluateJavascript("window.onNativeOAuthFailure(999);", null));
                }
            });

        } catch (ApiException e) {
            Log.w(TAG, "signInResult:failed code=" + e.getStatusCode());
            runOnUiThread(() -> webView.evaluateJavascript("window.onNativeOAuthFailure(" + e.getStatusCode() + ");", null));
        }
    }

    @Override
    @SuppressWarnings("deprecation")
    public void onBackPressed() {
        if (webView != null && webView.canGoBack()) {
            webView.goBack();
            return;
        }
        super.onBackPressed();
    }

    private void startProgressTimer() {
        stopProgressTimer();
        progressTimer = new Timer();
        progressTimer.scheduleAtFixedRate(new TimerTask() {
            @Override
            public void run() {
                updateDownloadProgress();
            }
        }, 0, 500);
    }

    private void stopProgressTimer() {
        if (progressTimer != null) {
            progressTimer.cancel();
            progressTimer = null;
        }
    }

    private void updateDownloadProgress() {
        if (downloadId == -1) return;

        DownloadManager.Query query = new DownloadManager.Query();
        query.setFilterById(downloadId);
        Cursor cursor = downloadManager.query(query);
        if (cursor.moveToFirst()) {
            @SuppressLint("Range") int bytesDownloaded = cursor.getInt(cursor.getColumnIndex(DownloadManager.COLUMN_BYTES_DOWNLOADED_SO_FAR));
            @SuppressLint("Range") int bytesTotal = cursor.getInt(cursor.getColumnIndex(DownloadManager.COLUMN_TOTAL_SIZE_BYTES));
            @SuppressLint("Range") int status = cursor.getInt(cursor.getColumnIndex(DownloadManager.COLUMN_STATUS));

            if (status == DownloadManager.STATUS_SUCCESSFUL) {
                stopProgressTimer();
                runOnUiThread(() -> webView.evaluateJavascript("window.onUpdateDownloadProgress(100, 'success')", null));
            } else if (status == DownloadManager.STATUS_FAILED) {
                stopProgressTimer();
                @SuppressLint("Range") int reason = cursor.getInt(cursor.getColumnIndex(DownloadManager.COLUMN_REASON));
                runOnUiThread(() -> webView.evaluateJavascript("window.onUpdateDownloadProgress(0, 'failed', '" + reason + "')", null));
            } else {
                int progress = bytesTotal > 0 ? (int) ((bytesDownloaded * 100L) / bytesTotal) : 0;
                runOnUiThread(() -> webView.evaluateJavascript("window.onUpdateDownloadProgress(" + progress + ", 'downloading')", null));
            }
        }
        cursor.close();
    }

    private final BroadcastReceiver onDownloadComplete = new BroadcastReceiver() {
        @Override
        public void onReceive(Context context, Intent intent) {
            long id = intent.getLongExtra(DownloadManager.EXTRA_DOWNLOAD_ID, -1);
            if (downloadId == id) {
                updateDownloadProgress();
            }
        }
    };

    public class SolarAndroidBridge {
        @JavascriptInterface
        public void startGoogleSignIn() {
            runOnUiThread(() -> {
                GoogleSignInOptions gso = new GoogleSignInOptions.Builder(GoogleSignInOptions.DEFAULT_SIGN_IN)
                        .requestEmail()
                        .requestScopes(new Scope("https://www.googleapis.com/auth/drive.appdata"))
                        .build();

                mGoogleSignInClient = GoogleSignIn.getClient(MainActivity.this, gso);
                
                Intent signInIntent = mGoogleSignInClient.getSignInIntent();
                startActivityForResult(signInIntent, RC_SIGN_IN);
            });
        }

        @JavascriptInterface
        public void silentSignInGoogle() {
            runOnUiThread(() -> {
                GoogleSignInOptions gso = new GoogleSignInOptions.Builder(GoogleSignInOptions.DEFAULT_SIGN_IN)
                        .requestEmail()
                        .requestScopes(new Scope("https://www.googleapis.com/auth/drive.appdata"))
                        .build();

                mGoogleSignInClient = GoogleSignIn.getClient(MainActivity.this, gso);
                
                Task<GoogleSignInAccount> task = mGoogleSignInClient.silentSignIn();
                if (task.isSuccessful()) {
                    handleSignInResult(task);
                } else {
                    task.addOnCompleteListener(task1 -> {
                        try {
                            // Check if it succeeded
                            task1.getResult(ApiException.class);
                            handleSignInResult(task1);
                        } catch (ApiException e) {
                            Log.w(TAG, "silentSignInResult:failed code=" + e.getStatusCode());
                            // Just fail silently for the web UI since it's a silent sign-in attempt
                            runOnUiThread(() -> webView.evaluateJavascript("window.onNativeOAuthFailure(" + e.getStatusCode() + ");", null));
                        }
                    });
                }
            });
        }

        @JavascriptInterface
        public void signOutGoogle() {
            runOnUiThread(() -> {
                if (mGoogleSignInClient == null) {
                    GoogleSignInOptions gso = new GoogleSignInOptions.Builder(GoogleSignInOptions.DEFAULT_SIGN_IN)
                            .requestEmail()
                            .requestScopes(new Scope("https://www.googleapis.com/auth/drive.appdata"))
                            .build();
                    mGoogleSignInClient = GoogleSignIn.getClient(MainActivity.this, gso);
                }
                mGoogleSignInClient.signOut().addOnCompleteListener(task -> {
                    runOnUiThread(() -> webView.evaluateJavascript("if(window.onNativeSignOutComplete) window.onNativeSignOutComplete(true);", null));
                });
            });
        }

        @JavascriptInterface
        public void revokeGoogleAccess() {
            runOnUiThread(() -> {
                if (mGoogleSignInClient == null) {
                    GoogleSignInOptions gso = new GoogleSignInOptions.Builder(GoogleSignInOptions.DEFAULT_SIGN_IN)
                            .requestEmail()
                            .requestScopes(new Scope("https://www.googleapis.com/auth/drive.appdata"))
                            .build();
                    mGoogleSignInClient = GoogleSignIn.getClient(MainActivity.this, gso);
                }
                mGoogleSignInClient.revokeAccess().addOnCompleteListener(task -> {
                    runOnUiThread(() -> webView.evaluateJavascript("if(window.onNativeRevokeComplete) window.onNativeRevokeComplete(true);", null));
                });
            });
        }

        @JavascriptInterface
        public String getAppVersion() {
            try {
                return getPackageManager().getPackageInfo(getPackageName(), 0).versionName;
            } catch (Exception e) {
                Log.e(TAG, "Failed to get app version", e);
                return "";
            }
        }

        @JavascriptInterface
        public void setSystemColors(String colorHex, boolean isLightText) {
            runOnUiThread(() -> {
                try {
                    int color = Color.parseColor(colorHex);
                    Window window = getWindow();
                    window.addFlags(WindowManager.LayoutParams.FLAG_DRAWS_SYSTEM_BAR_BACKGROUNDS);
                    window.setStatusBarColor(color);
                    window.setNavigationBarColor(color);
                    
                    View decorView = window.getDecorView();
                    int flags = decorView.getSystemUiVisibility();
                    if (isLightText) {
                        flags &= ~View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR;
                        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                            flags &= ~View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR;
                        }
                    } else {
                        flags |= View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR;
                        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                            flags |= View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR;
                        }
                    }
                    decorView.setSystemUiVisibility(flags);
                } catch (Exception e) {
                    Log.e(TAG, "Failed to set system colors", e);
                }
            });
        }

        @JavascriptInterface
        public void saveBackup(String json) {
            pendingBackupJson = json;
            String fileName = "solar-prophecy-backup-" + System.currentTimeMillis() + ".json";
            
            Intent intent = new Intent(Intent.ACTION_CREATE_DOCUMENT);
            intent.addCategory(Intent.CATEGORY_OPENABLE);
            intent.setType("application/json");
            intent.putExtra(Intent.EXTRA_TITLE, fileName);
            
            startActivityForResult(intent, CREATE_FILE_REQUEST_CODE);
        }

        @JavascriptInterface
        public void startUpdateDownload(String url, String versionName) {
            Log.i(TAG, "Download started for version: " + versionName + " from URL: " + url);
            
            // Temporary Mitigation: Clean up previous Solar Prophecy APKs
            try {
                java.io.File downloadDir = getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS);
                if (downloadDir != null && downloadDir.exists() && downloadDir.isDirectory()) {
                    java.io.File[] files = downloadDir.listFiles();
                    if (files != null) {
                        for (java.io.File file : files) {
                            if (file.isFile() && file.getName().endsWith(".apk")) {
                                boolean deleted = file.delete();
                                Log.i(TAG, "Cleanup: Deleted old APK " + file.getName() + " -> " + deleted);
                            }
                        }
                    }
                }
            } catch (Exception e) {
                Log.e(TAG, "Failed to clean up old OTA files", e);
            }

            DownloadManager.Request request = new DownloadManager.Request(Uri.parse(url));
            request.setTitle("Solar Prophecy Update");
            request.setDescription("Downloading version " + versionName);
            request.setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED);
            request.setMimeType("application/vnd.android.package-archive");
            request.setDestinationInExternalFilesDir(MainActivity.this, Environment.DIRECTORY_DOWNLOADS, "update.apk");
            
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
                request.setRequiresCharging(false);
                request.setRequiresDeviceIdle(false);
            }

            downloadId = downloadManager.enqueue(request);
            startProgressTimer();
        }

        @JavascriptInterface
        public void installUpdate(String versionName) {
            Log.i(TAG, "Install button pressed. Launching installer for version: " + versionName);
            try {
                java.io.File downloadDir = getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS);
                java.io.File updateFile = new java.io.File(downloadDir, "update.apk");
                
                if (updateFile.exists()) {
                    Uri apkUri = FileProvider.getUriForFile(MainActivity.this, getApplicationContext().getPackageName() + ".fileprovider", updateFile);
                    Intent intent = new Intent(Intent.ACTION_VIEW);
                    intent.setDataAndType(apkUri, "application/vnd.android.package-archive");
                    intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_GRANT_READ_URI_PERMISSION);
                    startActivity(intent);
                } else {
                    Log.e(TAG, "Update file not found: " + updateFile.getAbsolutePath());
                    Toast.makeText(MainActivity.this, "Update file not found", Toast.LENGTH_SHORT).show();
                }
            } catch (Exception e) {
                Log.e(TAG, "Failed to start install intent: " + e.getMessage());
                Toast.makeText(MainActivity.this, "Failed to start install", Toast.LENGTH_SHORT).show();
            }
        }
    }
}
