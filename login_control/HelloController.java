package com.example.identification;


import javafx.event.ActionEvent;
import javafx.fxml.FXML;
import javafx.fxml.FXMLLoader;
import javafx.scene.Node;
import javafx.scene.Parent;
import javafx.scene.Scene;
import javafx.scene.control.Button;
import javafx.scene.control.Label;
import javafx.stage.Stage;

import java.io.IOException;

public class HelloController {

    public Button signUp;
    public Button logIn;

    @FXML
    public void Signup(ActionEvent actionEvent) {
        try {
            // this will load the fxml file using a try catch for errors
            FXMLLoader fxmlLoader = new FXMLLoader(HelloApplication.class.getResource("sign-up.fxml"));
            Parent root = fxmlLoader.load();

            // this will get the current stage to be able to switch stages
            Node signUpButton = (Node) actionEvent.getSource();
            Stage stage = (Stage) signUpButton.getScene().getWindow();

            // this is setting the new scene to the stage
            Scene scene = new Scene(root);
            stage.setScene(scene);
        } catch (IOException e) {
            e.printStackTrace();
        }
    }

    public void LogIn(ActionEvent actionEvent) {
        try {
            // we repeat the same thing down here but for the login button
            FXMLLoader fxmlLoader = new FXMLLoader(HelloApplication.class.getResource("log-in.fxml"));
            Parent root = fxmlLoader.load();

            Node logInButton = (Node) actionEvent.getSource();
            Stage stage = (Stage) logInButton.getScene().getWindow();

            Scene scene = new Scene(root);
            stage.setScene(scene);
        } catch (IOException e) {
            e.printStackTrace();
        }
    }
}

/*

- make different scenes for the different buttons
- make a fxml for the different scenes (login and sign up)
- make a controller for login and sign up
- use jbcrypt to hash the password
-
 */

/*
encryption standard??
private static SecretKeySpec secret key
private static byte[] key

public static void setKey(String myKey) {
    MessageDigest sha = null;
        key = myKey.getBytes("UTF-8");
        sha = MessageDigest.getInstance("SHA-1");
        key = sha.digest(key);
        key = Arrays.copyOf(key, 16);
        secretKey = new SecretKeySpec(key, "AES");
        }

        public static String encrypt(String strToEncrypt, String secret) {
                setKey(secret);

                Cipher cipher = Cipher.getInstance("AES/ECB/PKCS5Padding");
                cipher.init(Cipher.ENCRYPT_MODE, secretKey);
                byte[] strToEncrypt = strToEncrypt.getBytes("UTF-8");
                byte[] finalCipher = cipher.doFinal(strToEncrypt);
                return Base64.getEncoder().encodeToString(finalCipher);
        }
one way hashing
    - once the hash is created, it can not be decrypted
    - same message = the same hash
    - a small change to a message should chang ethe hash value so extensively that the new hash appears uncorrelated with the old hash
    - hash the password
    - salting uses a randomly generated string used with the password to create a hash so that the same password will not have the same hash
    - jbcrypt is a password hashing function designed to be slow and expensive to compute

   salting the password

    private static byte[] getSalt() throws NoSuchAlgorithmException {
        SecureRandom random = new SecureRandom.getInstance("SHA1PRNG");
        byte[] salt = new byte[16];
        random.nextBytes(salt);
        return salt;
    }
    private static String getSecurePassword(String passwordToHash, byte[] salt)
    {
        String generatedPassword = null;
        MessageDigest md = MessageDigest.getInstance("SHA-512");
        md.update(salt);
        byte[] bytes = md.digest(passwordToHash.getBytes());
        StringBuilder sb = new StringBuilder();
        for(int i=0; i< bytes.length ;i++) {
            sb.append(Integer.toString((bytes[i] & 0xff) + 0x100, 16).substring(1));
        }
        generatedPassword = sb.toString();
        }
        return generatedPassword;
        }


 */