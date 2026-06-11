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

    @Override
    @SuppressLint("SetJavaScriptEnabled")
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        assetLoader = new WebViewAssetLoader.Builder()
                .addPathHandler("/assets/", new WebViewAssetLoader.AssetsPathHandler(this))
                .build();

        webView = new WebView(this);
        webView.setWebViewClient(new WebViewClient() {
            @Override
            public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                return assetLoader.shouldInterceptRequest(request.getUrl());
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
        registerReceiver(onDownloadComplete, new IntentFilter(DownloadManager.ACTION_DOWNLOAD_COMPLETE));
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
            DownloadManager.Request request = new DownloadManager.Request(Uri.parse(url));
            request.setTitle("Solar Prophecy Update");
            request.setDescription("Downloading version " + versionName);
            request.setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED);
            request.setDestinationInExternalPublicDir(Environment.DIRECTORY_DOWNLOADS, "SolarProphecy/SolarProphecy-" + versionName + ".apk");
            
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
                request.setRequiresCharging(false);
                request.setRequiresDeviceIdle(false);
            }

            downloadId = downloadManager.enqueue(request);
            startProgressTimer();
        }

        @JavascriptInterface
        public void installUpdate(String versionName) {
            Log.i(TAG, "Install button pressed for version: " + versionName);
            File file = new File(Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS), "SolarProphecy/SolarProphecy-" + versionName + ".apk");
            if (file.exists()) {
                try {
                    Intent intent = new Intent(Intent.ACTION_VIEW);
                    Uri apkUri = FileProvider.getUriForFile(MainActivity.this, getPackageName() + ".fileprovider", file);
                    Log.i(TAG, "APK URI generated: " + apkUri.toString());
                    intent.setDataAndType(apkUri, "application/vnd.android.package-archive");
                    intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
                    intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                    Log.i(TAG, "Install intent launched");
                    startActivity(intent);
                } catch (Exception e) {
                    Log.e(TAG, "Install launch failed: " + e.getMessage(), e);
                    runOnUiThread(() -> webView.evaluateJavascript("window.onInstallFailed('" + e.getMessage().replace("'", "\\'") + "')", null));
                }
            } else {
                Log.e(TAG, "Update file not found at: " + file.getAbsolutePath());
                runOnUiThread(() -> webView.evaluateJavascript("window.onInstallFailed('File not found')", null));
            }
        }

        @JavascriptInterface
        public void openDownloadsFolder() {
            try {
                Intent intent = new Intent(DownloadManager.ACTION_VIEW_DOWNLOADS);
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                startActivity(intent);
            } catch (Exception e) {
                Log.e(TAG, "Failed to open downloads folder: " + e.getMessage());
            }
        }
    }
}
