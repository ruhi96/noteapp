package com.noteapp.android;

import android.app.Activity;
import android.content.Intent;
import android.database.Cursor;
import android.net.Uri;
import android.os.Bundle;
import android.provider.OpenableColumns;
import android.view.Menu;
import android.view.MenuItem;
import android.view.View;
import android.widget.Button;
import android.widget.EditText;
import android.widget.ProgressBar;
import android.widget.TextView;
import android.widget.Toast;

import androidx.annotation.NonNull;
import androidx.appcompat.app.AppCompatActivity;

import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.auth.FirebaseUser;
import com.noteapp.android.api.ApiService;
import com.noteapp.android.models.Note;

import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;

public class AddEditNoteActivity extends AppCompatActivity {
    private static final String TAG = "AddEditNoteActivity";
    private static final int REQUEST_PICK_FILE = 100;

    private ApiService apiService;
    private EditText titleEdit;
    private EditText contentEdit;
    private Button attachFileButton;
    private TextView attachedFileText;
    private ProgressBar progressBar;

    private int noteId = -1;
    private boolean isEditMode = false;
    private File selectedFile;
    private String existingFileUrl;
    private String existingFileName;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_add_edit_note);

        // Enable back button in action bar
        if (getSupportActionBar() != null) {
            getSupportActionBar().setDisplayHomeAsUpEnabled(true);
        }

        apiService = new ApiService();

        // Initialize views
        titleEdit = findViewById(R.id.edit_title);
        contentEdit = findViewById(R.id.edit_content);
        attachFileButton = findViewById(R.id.btn_attach_file);
        attachedFileText = findViewById(R.id.attached_file_text);
        progressBar = findViewById(R.id.progress_bar);

        // Check if editing existing note
        Intent intent = getIntent();
        if (intent.hasExtra("note_id")) {
            isEditMode = true;
            noteId = intent.getIntExtra("note_id", -1);
            titleEdit.setText(intent.getStringExtra("note_title"));
            contentEdit.setText(intent.getStringExtra("note_content"));
            existingFileUrl = intent.getStringExtra("note_file_url");
            existingFileName = intent.getStringExtra("note_file_name");

            if (existingFileName != null && !existingFileName.isEmpty()) {
                attachedFileText.setText("Attached: " + existingFileName);
                attachedFileText.setVisibility(View.VISIBLE);
            }

            setTitle("Edit Note");
        } else {
            setTitle("Add Note");
        }

        attachFileButton.setOnClickListener(v -> pickFile());

        // Get auth token
        FirebaseUser user = FirebaseAuth.getInstance().getCurrentUser();
        if (user != null) {
            user.getIdToken(true).addOnCompleteListener(task -> {
                if (task.isSuccessful()) {
                    String token = task.getResult().getToken();
                    apiService.setAuthToken(token);
                }
            });
        }
    }

    @Override
    public boolean onCreateOptionsMenu(Menu menu) {
        getMenuInflater().inflate(R.menu.menu_add_edit_note, menu);
        return true;
    }

    @Override
    public boolean onOptionsItemSelected(@NonNull MenuItem item) {
        if (item.getItemId() == R.id.action_save) {
            saveNote();
            return true;
        } else if (item.getItemId() == android.R.id.home) {
            finish();
            return true;
        }
        return super.onOptionsItemSelected(item);
    }

    private void pickFile() {
        Intent intent = new Intent(Intent.ACTION_GET_CONTENT);
        intent.setType("*/*");
        intent.addCategory(Intent.CATEGORY_OPENABLE);
        startActivityForResult(intent, REQUEST_PICK_FILE);
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        
        if (requestCode == REQUEST_PICK_FILE && resultCode == Activity.RESULT_OK) {
            if (data != null) {
                Uri uri = data.getData();
                try {
                    // Get file name
                    String fileName = getFileName(uri);
                    
                    // Copy to cache directory
                    InputStream inputStream = getContentResolver().openInputStream(uri);
                    selectedFile = new File(getCacheDir(), fileName);
                    FileOutputStream outputStream = new FileOutputStream(selectedFile);
                    
                    byte[] buffer = new byte[4096];
                    int bytesRead;
                    while ((bytesRead = inputStream.read(buffer)) != -1) {
                        outputStream.write(buffer, 0, bytesRead);
                    }
                    
                    inputStream.close();
                    outputStream.close();
                    
                    attachedFileText.setText("Selected: " + fileName);
                    attachedFileText.setVisibility(View.VISIBLE);
                } catch (Exception e) {
                    Toast.makeText(this, "Failed to select file: " + e.getMessage(), Toast.LENGTH_SHORT).show();
                }
            }
        }
    }

    private String getFileName(Uri uri) {
        String result = null;
        if (uri.getScheme().equals("content")) {
            Cursor cursor = getContentResolver().query(uri, null, null, null, null);
            try {
                if (cursor != null && cursor.moveToFirst()) {
                    int nameIndex = cursor.getColumnIndex(OpenableColumns.DISPLAY_NAME);
                    if (nameIndex != -1) {
                        result = cursor.getString(nameIndex);
                    }
                }
            } finally {
                if (cursor != null) {
                    cursor.close();
                }
            }
        }
        if (result == null) {
            result = uri.getPath();
            int cut = result.lastIndexOf('/');
            if (cut != -1) {
                result = result.substring(cut + 1);
            }
        }
        return result;
    }

    private void saveNote() {
        String title = titleEdit.getText().toString().trim();
        String content = contentEdit.getText().toString().trim();

        if (title.isEmpty()) {
            titleEdit.setError("Title is required");
            return;
        }

        showLoading(true);

        // If file is selected, upload it first
        if (selectedFile != null) {
            uploadFileAndSaveNote(title, content);
        } else {
            saveNoteToServer(title, content, existingFileUrl, existingFileName);
        }
    }

    private void uploadFileAndSaveNote(String title, String content) {
        apiService.uploadFile(selectedFile, new ApiService.ApiCallback<String>() {
            @Override
            public void onSuccess(String result) {
                // Parse the response JSON to get fileUrl and fileName
                try {
                    org.json.JSONObject jsonResponse = new org.json.JSONObject(result);
                    String fileUrl = jsonResponse.getString("fileUrl");
                    String fileName = jsonResponse.getString("fileName");
                    runOnUiThread(() -> saveNoteToServer(title, content, fileUrl, fileName));
                } catch (Exception e) {
                    runOnUiThread(() -> {
                        showError("Failed to parse upload response: " + e.getMessage());
                        showLoading(false);
                    });
                }
            }

            @Override
            public void onError(String error) {
                runOnUiThread(() -> {
                    showError("Failed to upload file: " + error);
                    showLoading(false);
                });
            }
        });
    }

    private void saveNoteToServer(String title, String content, String fileUrl, String fileName) {
        Note note = new Note(title, content);
        note.setFileUrl(fileUrl);
        note.setFileName(fileName);

        if (isEditMode) {
            apiService.updateNote(noteId, note, new ApiService.ApiCallback<Note>() {
                @Override
                public void onSuccess(Note result) {
                    runOnUiThread(() -> {
                        showLoading(false);
                        Toast.makeText(AddEditNoteActivity.this, "Note updated", Toast.LENGTH_SHORT).show();
                        setResult(RESULT_OK);
                        finish();
                    });
                }

                @Override
                public void onError(String error) {
                    runOnUiThread(() -> {
                        showError("Failed to update note: " + error);
                        showLoading(false);
                    });
                }
            });
        } else {
            apiService.createNote(note, new ApiService.ApiCallback<Note>() {
                @Override
                public void onSuccess(Note result) {
                    runOnUiThread(() -> {
                        showLoading(false);
                        Toast.makeText(AddEditNoteActivity.this, "Note created", Toast.LENGTH_SHORT).show();
                        setResult(RESULT_OK);
                        finish();
                    });
                }

                @Override
                public void onError(String error) {
                    runOnUiThread(() -> {
                        showError("Failed to create note: " + error);
                        showLoading(false);
                    });
                }
            });
        }
    }

    private void showLoading(boolean show) {
        progressBar.setVisibility(show ? View.VISIBLE : View.GONE);
        attachFileButton.setEnabled(!show);
    }

    private void showError(String message) {
        Toast.makeText(this, message, Toast.LENGTH_LONG).show();
    }
}

