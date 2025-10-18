package com.noteapp.android.models;

import com.google.gson.annotations.SerializedName;

public class SubscriptionStatus {
    @SerializedName("is_premium")
    private boolean isPremium;
    
    @SerializedName("subscription_status")
    private String subscriptionStatus;
    
    @SerializedName("plan_name")
    private String planName;
    
    @SerializedName("expires_at")
    private String expiresAt;

    public boolean isPremium() {
        return isPremium;
    }

    public void setPremium(boolean premium) {
        isPremium = premium;
    }

    public String getSubscriptionStatus() {
        return subscriptionStatus;
    }

    public void setSubscriptionStatus(String subscriptionStatus) {
        this.subscriptionStatus = subscriptionStatus;
    }

    public String getPlanName() {
        return planName;
    }

    public void setPlanName(String planName) {
        this.planName = planName;
    }

    public String getExpiresAt() {
        return expiresAt;
    }

    public void setExpiresAt(String expiresAt) {
        this.expiresAt = expiresAt;
    }
}

