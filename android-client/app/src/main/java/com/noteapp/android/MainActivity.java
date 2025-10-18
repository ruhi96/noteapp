package com.noteapp.android;

import android.content.Intent;
import android.os.Bundle;
import android.util.Log;
import android.view.View;
import android.widget.Button;
import android.widget.ProgressBar;
import android.widget.TextView;
import android.widget.Toast;

import androidx.annotation.NonNull;
import androidx.appcompat.app.AppCompatActivity;

import com.google.android.gms.auth.api.signin.GoogleSignIn;
import com.google.android.gms.auth.api.signin.GoogleSignInAccount;
import com.google.android.gms.auth.api.signin.GoogleSignInClient;
import com.google.android.gms.auth.api.signin.GoogleSignInOptions;
import com.google.android.gms.common.api.ApiException;
import com.google.android.gms.tasks.OnCompleteListener;
import com.google.android.gms.tasks.Task;
import com.google.firebase.auth.AuthCredential;
import com.google.firebase.auth.AuthResult;
import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.auth.FirebaseUser;
import com.google.firebase.auth.GoogleAuthProvider;

public class MainActivity extends AppCompatActivity {
    private static final String TAG = "MainActivity";
    private static final int RC_SIGN_IN = 9001;

    private FirebaseAuth mAuth;
    private GoogleSignInClient mGoogleSignInClient;
    
    private Button signInButton;
    private ProgressBar progressBar;
    private TextView statusText;
    private TextView debugText;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        // Initialize Firebase Auth
        mAuth = FirebaseAuth.getInstance();

        // Initialize views
        signInButton = findViewById(R.id.sign_in_button);
        progressBar = findViewById(R.id.progress_bar);
        statusText = findViewById(R.id.status_text);
        debugText = findViewById(R.id.debug_text);

        // Configure Google Sign In
        GoogleSignInOptions gso = new GoogleSignInOptions.Builder(GoogleSignInOptions.DEFAULT_SIGN_IN)
                .requestIdToken(getString(R.string.default_web_client_id))
                .requestEmail()
                .build();

        mGoogleSignInClient = GoogleSignIn.getClient(this, gso);

        signInButton.setOnClickListener(v -> signIn());

        // Check if user is already signed in
        FirebaseUser currentUser = mAuth.getCurrentUser();
        if (currentUser != null) {
            navigateToNotes();
        }
    }

    private void signIn() {
        showLoading(true);
        addDebugLog("🔵 Starting Google Sign-In...");
        Intent signInIntent = mGoogleSignInClient.getSignInIntent();
        startActivityForResult(signInIntent, RC_SIGN_IN);
    }

    @Override
    public void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);

        if (requestCode == RC_SIGN_IN) {
            Task<GoogleSignInAccount> task = GoogleSignIn.getSignedInAccountFromIntent(data);
            try {
                GoogleSignInAccount account = task.getResult(ApiException.class);
                addDebugLog("✅ Google Sign-In successful");
                addDebugLog("📧 Email: " + account.getEmail());
                addDebugLog("👤 Name: " + account.getDisplayName());
                addDebugLog("🔑 ID Token: " + account.getIdToken().substring(0, 50) + "...");
                addDebugLog("🔵 Authenticating with Firebase...");
                firebaseAuthWithGoogle(account);
            } catch (ApiException e) {
                Log.w(TAG, "Google sign in failed", e);
                addDebugLog("❌ Google Sign-In failed: " + e.getStatusCode());
                addDebugLog("Error: " + e.getMessage());
                showError("Google sign in failed: Code " + e.getStatusCode() + "\n" + e.getMessage());
                showLoading(false);
            }
        }
    }

    private void firebaseAuthWithGoogle(GoogleSignInAccount acct) {
        Log.d(TAG, "firebaseAuthWithGoogle:" + acct.getId());
        addDebugLog("🔵 Signing in to Firebase...");

        AuthCredential credential = GoogleAuthProvider.getCredential(acct.getIdToken(), null);
        mAuth.signInWithCredential(credential)
                .addOnCompleteListener(this, new OnCompleteListener<AuthResult>() {
                    @Override
                    public void onComplete(@NonNull Task<AuthResult> task) {
                        if (task.isSuccessful()) {
                            Log.d(TAG, "signInWithCredential:success");
                            FirebaseUser user = mAuth.getCurrentUser();
                            addDebugLog("✅ Firebase authentication successful!");
                            addDebugLog("👤 User ID: " + user.getUid());
                            addDebugLog("📧 Email: " + user.getEmail());
                            
                            // Get Firebase ID token
                            user.getIdToken(true).addOnCompleteListener(tokenTask -> {
                                if (tokenTask.isSuccessful()) {
                                    String token = tokenTask.getResult().getToken();
                                    addDebugLog("🔑 Firebase ID Token obtained");
                                    addDebugLog("Token (first 100 chars): " + token.substring(0, Math.min(100, token.length())) + "...");
                                    addDebugLog("Token length: " + token.length() + " chars");
                                    addDebugLog("✅ Navigating to notes...");
                                    
                                    // Wait 2 seconds so user can see debug info
                                    new android.os.Handler().postDelayed(() -> navigateToNotes(), 2000);
                                } else {
                                    addDebugLog("❌ Failed to get Firebase token");
                                    showError("Failed to get auth token: " + tokenTask.getException().getMessage());
                                }
                            });
                        } else {
                            Log.w(TAG, "signInWithCredential:failure", task.getException());
                            addDebugLog("❌ Firebase authentication failed!");
                            addDebugLog("Error: " + task.getException().getMessage());
                            showError("Firebase auth failed:\n" + task.getException().getMessage());
                            showLoading(false);
                        }
                    }
                });
    }

    private void navigateToNotes() {
        Intent intent = new Intent(MainActivity.this, NotesActivity.class);
        intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TASK);
        startActivity(intent);
        finish();
    }

    private void showLoading(boolean show) {
        runOnUiThread(() -> {
            progressBar.setVisibility(show ? View.VISIBLE : View.GONE);
            signInButton.setEnabled(!show);
        });
    }

    private void showError(String message) {
        runOnUiThread(() -> {
            Toast.makeText(MainActivity.this, message, Toast.LENGTH_LONG).show();
            statusText.setText(message);
            statusText.setVisibility(View.VISIBLE);
        });
    }
    
    private void addDebugLog(String message) {
        runOnUiThread(() -> {
            String timestamp = new java.text.SimpleDateFormat("HH:mm:ss", java.util.Locale.getDefault()).format(new java.util.Date());
            String currentText = debugText.getText().toString();
            String newText = currentText + "\n[" + timestamp + "] " + message;
            debugText.setText(newText);
            debugText.setVisibility(View.VISIBLE);
            
            // Auto-scroll to bottom
            final android.widget.ScrollView scrollView = findViewById(R.id.debug_scroll);
            if (scrollView != null) {
                scrollView.post(() -> scrollView.fullScroll(View.FOCUS_DOWN));
            }
            
            // Also log to Logcat
            Log.d(TAG, message);
        });
    }
}

