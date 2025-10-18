package com.noteapp.android;

import android.content.Intent;
import android.os.Bundle;
import android.view.Menu;
import android.view.MenuItem;
import android.view.View;
import android.widget.ProgressBar;
import android.widget.TextView;
import android.widget.Toast;

import androidx.annotation.NonNull;
import androidx.appcompat.app.AlertDialog;
import androidx.appcompat.app.AppCompatActivity;
import androidx.recyclerview.widget.LinearLayoutManager;
import androidx.recyclerview.widget.RecyclerView;
import androidx.swiperefreshlayout.widget.SwipeRefreshLayout;

import com.google.android.material.floatingactionbutton.FloatingActionButton;
import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.auth.FirebaseUser;
import com.noteapp.android.adapters.NotesAdapter;
import com.noteapp.android.api.ApiService;
import com.noteapp.android.models.Note;
import com.noteapp.android.models.SubscriptionStatus;

import java.util.ArrayList;
import java.util.List;

public class NotesActivity extends AppCompatActivity implements NotesAdapter.OnNoteClickListener {
    private static final String TAG = "NotesActivity";
    private static final int REQUEST_ADD_NOTE = 1;
    private static final int REQUEST_EDIT_NOTE = 2;

    private FirebaseAuth mAuth;
    private ApiService apiService;
    private NotesAdapter adapter;
    
    private RecyclerView recyclerView;
    private SwipeRefreshLayout swipeRefresh;
    private ProgressBar progressBar;
    private TextView emptyView;
    private TextView premiumStatusText;
    private FloatingActionButton fabAddNote;

    private List<Note> notesList = new ArrayList<>();
    private boolean isPremium = false;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_notes);

        mAuth = FirebaseAuth.getInstance();
        apiService = new ApiService();

        // Initialize views
        recyclerView = findViewById(R.id.notes_recycler_view);
        swipeRefresh = findViewById(R.id.swipe_refresh);
        progressBar = findViewById(R.id.progress_bar);
        emptyView = findViewById(R.id.empty_view);
        premiumStatusText = findViewById(R.id.premium_status_text);
        fabAddNote = findViewById(R.id.fab_add_note);

        // Setup RecyclerView
        adapter = new NotesAdapter(notesList, this);
        recyclerView.setLayoutManager(new LinearLayoutManager(this));
        recyclerView.setAdapter(adapter);

        // Setup SwipeRefresh
        swipeRefresh.setOnRefreshListener(this::loadNotes);

        // Setup FAB
        fabAddNote.setOnClickListener(v -> {
            Intent intent = new Intent(NotesActivity.this, AddEditNoteActivity.class);
            startActivityForResult(intent, REQUEST_ADD_NOTE);
        });

        // Check authentication
        FirebaseUser user = mAuth.getCurrentUser();
        if (user == null) {
            navigateToLogin();
            return;
        }

        // Get auth token and load data
        user.getIdToken(true).addOnCompleteListener(task -> {
            if (task.isSuccessful()) {
                String token = task.getResult().getToken();
                apiService.setAuthToken(token);
                loadSubscriptionStatus();
                loadNotes();
            } else {
                showError("Failed to get auth token");
            }
        });
    }

    @Override
    public boolean onCreateOptionsMenu(Menu menu) {
        getMenuInflater().inflate(R.menu.menu_notes, menu);
        return true;
    }

    @Override
    public boolean onOptionsItemSelected(@NonNull MenuItem item) {
        if (item.getItemId() == R.id.action_logout) {
            logout();
            return true;
        } else if (item.getItemId() == R.id.action_refresh) {
            loadNotes();
            return true;
        }
        return super.onOptionsItemSelected(item);
    }

    private void loadNotes() {
        showLoading(true);
        apiService.getNotes(new ApiService.ApiCallback<List<Note>>() {
            @Override
            public void onSuccess(List<Note> result) {
                runOnUiThread(() -> {
                    notesList.clear();
                    notesList.addAll(result);
                    adapter.notifyDataSetChanged();
                    updateEmptyView();
                    showLoading(false);
                });
            }

            @Override
            public void onError(String error) {
                runOnUiThread(() -> {
                    showError("Failed to load notes: " + error);
                    showLoading(false);
                });
            }
        });
    }

    private void loadSubscriptionStatus() {
        apiService.getSubscriptionStatus(new ApiService.ApiCallback<SubscriptionStatus>() {
            @Override
            public void onSuccess(SubscriptionStatus result) {
                runOnUiThread(() -> {
                    isPremium = result.isPremium();
                    updatePremiumStatus(result);
                });
            }

            @Override
            public void onError(String error) {
                runOnUiThread(() -> {
                    premiumStatusText.setText("Status: Free");
                    premiumStatusText.setVisibility(View.VISIBLE);
                });
            }
        });
    }

    private void updatePremiumStatus(SubscriptionStatus status) {
        if (status.isPremium()) {
            String text = "✓ Premium";
            if (status.getPlanName() != null) {
                text += " - " + status.getPlanName();
            }
            premiumStatusText.setText(text);
            premiumStatusText.setTextColor(getResources().getColor(android.R.color.holo_green_dark));
        } else {
            premiumStatusText.setText("Status: Free");
            premiumStatusText.setTextColor(getResources().getColor(android.R.color.darker_gray));
        }
        premiumStatusText.setVisibility(View.VISIBLE);
    }

    @Override
    public void onNoteClick(Note note) {
        Intent intent = new Intent(NotesActivity.this, AddEditNoteActivity.class);
        intent.putExtra("note_id", note.getId());
        intent.putExtra("note_title", note.getTitle());
        intent.putExtra("note_content", note.getContent());
        intent.putExtra("note_file_url", note.getFileUrl());
        intent.putExtra("note_file_name", note.getFileName());
        startActivityForResult(intent, REQUEST_EDIT_NOTE);
    }

    @Override
    public void onNoteLongClick(Note note) {
        new AlertDialog.Builder(this)
                .setTitle("Delete Note")
                .setMessage("Are you sure you want to delete this note?")
                .setPositiveButton("Delete", (dialog, which) -> deleteNote(note))
                .setNegativeButton("Cancel", null)
                .show();
    }

    private void deleteNote(Note note) {
        showLoading(true);
        apiService.deleteNote(note.getId(), new ApiService.ApiCallback<Void>() {
            @Override
            public void onSuccess(Void result) {
                runOnUiThread(() -> {
                    notesList.remove(note);
                    adapter.notifyDataSetChanged();
                    updateEmptyView();
                    showLoading(false);
                    Toast.makeText(NotesActivity.this, "Note deleted", Toast.LENGTH_SHORT).show();
                });
            }

            @Override
            public void onError(String error) {
                runOnUiThread(() -> {
                    showError("Failed to delete note: " + error);
                    showLoading(false);
                });
            }
        });
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (resultCode == RESULT_OK) {
            loadNotes(); // Refresh the list
        }
    }

    private void logout() {
        mAuth.signOut();
        navigateToLogin();
    }

    private void navigateToLogin() {
        Intent intent = new Intent(NotesActivity.this, MainActivity.class);
        intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TASK);
        startActivity(intent);
        finish();
    }

    private void showLoading(boolean show) {
        runOnUiThread(() -> {
            if (show) {
                progressBar.setVisibility(View.VISIBLE);
            } else {
                progressBar.setVisibility(View.GONE);
                swipeRefresh.setRefreshing(false);
            }
        });
    }

    private void updateEmptyView() {
        emptyView.setVisibility(notesList.isEmpty() ? View.VISIBLE : View.GONE);
    }

    private void showError(String message) {
        Toast.makeText(this, message, Toast.LENGTH_LONG).show();
    }
}

