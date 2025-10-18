package com.noteapp.android.models;

import com.google.gson.annotations.SerializedName;

public class Note {
    @SerializedName("id")
    private int id;
    
    @SerializedName("title")
    private String title;
    
    @SerializedName("content")
    private String content;
    
    @SerializedName("user_id")
    private String userId;
    
    @SerializedName("user_email")
    private String userEmail;
    
    @SerializedName("created_at")
    private String createdAt;
    
    @SerializedName("file_url")
    private String fileUrl;
    
    @SerializedName("file_name")
    private String fileName;
    
    // Constructor for creating/updating notes
    public Note(String title, String content, String fileUrl, String fileName) {
        this.title = title;
        this.content = content;
        this.fileUrl = fileUrl;
        this.fileName = fileName;
    }

    public Note() {
    }

    public Note(String title, String content) {
        this.title = title;
        this.content = content;
    }

    public int getId() {
        return id;
    }

    public void setId(int id) {
        this.id = id;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getContent() {
        return content;
    }

    public void setContent(String content) {
        this.content = content;
    }

    public String getUserId() {
        return userId;
    }

    public void setUserId(String userId) {
        this.userId = userId;
    }

    public String getUserEmail() {
        return userEmail;
    }

    public void setUserEmail(String userEmail) {
        this.userEmail = userEmail;
    }

    public String getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(String createdAt) {
        this.createdAt = createdAt;
    }

    public String getFileUrl() {
        return fileUrl;
    }

    public void setFileUrl(String fileUrl) {
        this.fileUrl = fileUrl;
    }

    public String getFileName() {
        return fileName;
    }

    public void setFileName(String fileName) {
        this.fileName = fileName;
    }
}

