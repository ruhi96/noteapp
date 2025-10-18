package com.noteapp.android.api;

import android.util.Log;

import com.google.gson.Gson;
import com.google.gson.reflect.TypeToken;
import com.noteapp.android.Config;
import com.noteapp.android.models.Note;
import com.noteapp.android.models.SubscriptionStatus;

import java.io.File;
import java.io.IOException;
import java.lang.reflect.Type;
import java.util.List;
import java.util.concurrent.TimeUnit;

import okhttp3.MediaType;
import okhttp3.MultipartBody;
import okhttp3.OkHttpClient;
import okhttp3.Request;
import okhttp3.RequestBody;
import okhttp3.Response;
import okhttp3.logging.HttpLoggingInterceptor;

public class ApiService {
    private static final String TAG = "ApiService";
    private final OkHttpClient client;
    private final Gson gson;
    private String authToken;

    public ApiService() {
        HttpLoggingInterceptor logging = new HttpLoggingInterceptor();
        logging.setLevel(HttpLoggingInterceptor.Level.BODY);

        client = new OkHttpClient.Builder()
                .addInterceptor(logging)
                .connectTimeout(30, TimeUnit.SECONDS)
                .readTimeout(30, TimeUnit.SECONDS)
                .writeTimeout(30, TimeUnit.SECONDS)
                .build();

        gson = new Gson();
    }

    public void setAuthToken(String token) {
        this.authToken = token;
    }

    public interface ApiCallback<T> {
        void onSuccess(T result);
        void onError(String error);
    }

    // Get all notes
    public void getNotes(ApiCallback<List<Note>> callback) {
        Request request = new Request.Builder()
                .url(Config.API_NOTES)
                .addHeader("Authorization", "Bearer " + authToken)
                .get()
                .build();

        executeRequest(request, new ApiCallback<String>() {
            @Override
            public void onSuccess(String result) {
                try {
                    Type listType = new TypeToken<List<Note>>() {}.getType();
                    List<Note> notes = gson.fromJson(result, listType);
                    callback.onSuccess(notes);
                } catch (Exception e) {
                    callback.onError("Failed to parse response: " + e.getMessage());
                }
            }

            @Override
            public void onError(String error) {
                callback.onError(error);
            }
        });
    }

    // Create a new note
    public void createNote(Note note, ApiCallback<Note> callback) {
        String json = gson.toJson(note);
        RequestBody body = RequestBody.create(json, MediaType.parse("application/json"));

        Request request = new Request.Builder()
                .url(Config.API_NOTES)
                .addHeader("Authorization", "Bearer " + authToken)
                .post(body)
                .build();

        executeRequest(request, new ApiCallback<String>() {
            @Override
            public void onSuccess(String result) {
                try {
                    Note createdNote = gson.fromJson(result, Note.class);
                    callback.onSuccess(createdNote);
                } catch (Exception e) {
                    callback.onError("Failed to parse response: " + e.getMessage());
                }
            }

            @Override
            public void onError(String error) {
                callback.onError(error);
            }
        });
    }

    // Update a note
    public void updateNote(int noteId, Note note, ApiCallback<Note> callback) {
        String json = gson.toJson(note);
        RequestBody body = RequestBody.create(json, MediaType.parse("application/json"));

        Request request = new Request.Builder()
                .url(Config.API_NOTES + "/" + noteId)
                .addHeader("Authorization", "Bearer " + authToken)
                .put(body)
                .build();

        executeRequest(request, new ApiCallback<String>() {
            @Override
            public void onSuccess(String result) {
                try {
                    Note updatedNote = gson.fromJson(result, Note.class);
                    callback.onSuccess(updatedNote);
                } catch (Exception e) {
                    callback.onError("Failed to parse response: " + e.getMessage());
                }
            }

            @Override
            public void onError(String error) {
                callback.onError(error);
            }
        });
    }

    // Delete a note
    public void deleteNote(int noteId, ApiCallback<Void> callback) {
        Request request = new Request.Builder()
                .url(Config.API_NOTES + "/" + noteId)
                .addHeader("Authorization", "Bearer " + authToken)
                .delete()
                .build();

        executeRequest(request, new ApiCallback<String>() {
            @Override
            public void onSuccess(String result) {
                callback.onSuccess(null);
            }

            @Override
            public void onError(String error) {
                callback.onError(error);
            }
        });
    }

    // Upload file
    public void uploadFile(File file, ApiCallback<String> callback) {
        RequestBody requestBody = new MultipartBody.Builder()
                .setType(MultipartBody.FORM)
                .addFormDataPart("file", file.getName(),
                        RequestBody.create(file, MediaType.parse("application/octet-stream")))
                .build();

        Request request = new Request.Builder()
                .url(Config.API_UPLOAD)
                .addHeader("Authorization", "Bearer " + authToken)
                .post(requestBody)
                .build();

        executeRequest(request, callback);
    }

    // Get subscription status
    public void getSubscriptionStatus(ApiCallback<SubscriptionStatus> callback) {
        Request request = new Request.Builder()
                .url(Config.API_SUBSCRIPTION)
                .addHeader("Authorization", "Bearer " + authToken)
                .get()
                .build();

        executeRequest(request, new ApiCallback<String>() {
            @Override
            public void onSuccess(String result) {
                try {
                    SubscriptionStatus status = gson.fromJson(result, SubscriptionStatus.class);
                    callback.onSuccess(status);
                } catch (Exception e) {
                    callback.onError("Failed to parse response: " + e.getMessage());
                }
            }

            @Override
            public void onError(String error) {
                callback.onError(error);
            }
        });
    }

    private void executeRequest(Request request, ApiCallback<String> callback) {
        new Thread(() -> {
            try {
                Response response = client.newCall(request).execute();
                String responseBody = response.body() != null ? response.body().string() : "";

                if (response.isSuccessful()) {
                    callback.onSuccess(responseBody);
                } else {
                    callback.onError("Error " + response.code() + ": " + responseBody);
                }
            } catch (IOException e) {
                Log.e(TAG, "Network error", e);
                callback.onError("Network error: " + e.getMessage());
            }
        }).start();
    }
}

