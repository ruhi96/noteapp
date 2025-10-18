package com.noteapp.android;

public class Config {
    // Replace with your actual backend URL
    // For local testing: http://10.0.2.2:3001 (Android emulator)
    // For production: https://your-app.onrender.com
    public static final String BASE_URL = "https://noteapp-moei.onrender.com";
    
    // API endpoints
    public static final String API_NOTES = BASE_URL + "/api/notes";
    public static final String API_CONFIG = BASE_URL + "/api/config";
    public static final String API_UPLOAD = BASE_URL + "/api/upload";
    public static final String API_SUBSCRIPTION = BASE_URL + "/api/user/subscription-status";
}

