package com.example.identification;

public class UserData {
    private static String encryptedName;
    private static String encryptedEmail;
    private static String hashedPassword;
    private static String salt;

    public static void setUserData(String encryptedName, String encryptedEmail, String hashedPassword, String salt) {
        UserData.encryptedName = encryptedName;
        UserData.encryptedEmail = encryptedEmail;
        UserData.hashedPassword = hashedPassword;
        UserData.salt = salt;
    }

    public static String getEncryptedName() {
        return encryptedName;
    }

    public static String getEncryptedEmail() {
        return encryptedEmail;
    }

    public static String getHashedPassword() {
        return hashedPassword;
    }

    public static String getSalt() {
        return salt;
    }
}
