package com.example.identification;

import javafx.event.ActionEvent;
import javafx.fxml.FXML;
import javafx.fxml.FXMLLoader;
import javafx.scene.Node;
import javafx.scene.Parent;
import javafx.scene.Scene;
import javafx.scene.control.*;
import javafx.stage.Stage;
import org.w3c.dom.UserDataHandler;

import javax.crypto.BadPaddingException;
import javax.crypto.IllegalBlockSizeException;
import javax.crypto.NoSuchPaddingException;
import java.io.File;
import java.io.FileNotFoundException;
import java.io.IOException;
import java.io.UnsupportedEncodingException;
import java.security.InvalidKeyException;
import java.security.NoSuchAlgorithmException;
import java.util.Scanner;


public class LogInController extends Encryption{

    @FXML
    public Button loginConfirm;
    @FXML
    public TextField textEmail;
    @FXML
    public PasswordField textFieldPassword;
    @FXML
    public Label userName;
    @FXML
    public Label userEmail;

    private String encryptedEmail;
    private String hashedPassword;
    private String salt;


    public void setLogAction(ActionEvent actionEvent) throws NoSuchAlgorithmException, UnsupportedEncodingException, NoSuchPaddingException, IllegalBlockSizeException, BadPaddingException, InvalidKeyException, FileNotFoundException {
        File file = new File("users.txt");
        Scanner read = new Scanner(file);
        if (!file.exists()) {
            showError("The users file could not be found.");
            return;
        }

        // Get the email and password from the text fields
        String emailText = textEmail.getText();
        String passwordText = textFieldPassword.getText();

        // Encrypt the email text
        String encryptedEmail = encrypt(emailText);

        // this will congifure the scanner to read the file
        //the scanner automatically reads the file line by line
        // read.useDelimiter(",");

        while (read.hasNext()) {
            read.next(); // skip header
            String line = read.next();
            // the reader will continue to read until it reaches the email
            String [] data = line.split(",");
            if (data[1].equals(encryptedEmail)) {
                // if the email is found, the reader will read the next lines, which is the name, salt, and password
                String salt = data[3];
                String name = data[0];

                String passwordHash = hashPassword(passwordText, salt);
                String storedPassword = data[2];
                // if the password is correct, the user will be logged in
                if (passwordHash.equals(storedPassword)) {
                    Alert alert = new Alert(Alert.AlertType.INFORMATION);
                    alert.setTitle("Login Successful");
                    alert.setContentText("You have successfully logged in!");
                    alert.showAndWait();

                    try {
                        // we repeat the same thing down here but for the login button
                        FXMLLoader fxmlLoader = new FXMLLoader(HelloApplication.class.getResource("user-page.fxml"));
                        Parent root = fxmlLoader.load();

                        Node logInButton = (Node) actionEvent.getSource();
                        Stage stage = (Stage) logInButton.getScene().getWindow();

                        Scene scene = new Scene(root);
                        stage.setScene(scene);

                        //
                        Label userName = (Label) scene.lookup("#userName");
                        Label userEmail = (Label) scene.lookup("#userEmail");

                        userName.setText(decrypt(name));
                        userEmail.setText(emailText);
                    } catch (IOException e) {
                        // if the password is incorrect, the user will be prompted to try again
                        alert.setTitle("Login Failed");
                        alert.setContentText("Incorrect password or email. Please try again.");
                        alert.showAndWait();
                        // e.printStackTrace();
                    }
                } else {
                    // if the password is incorrect, the user will be prompted to try again
                    Alert alert = new Alert(Alert.AlertType.ERROR);
                    alert.setTitle("Login Failed");
                    alert.setContentText("Incorrect password. Please try again.");
                    alert.showAndWait();
                }
            }
        }

    }

    private void showError(String errorMessage) { // shows that should be inputted
        Alert alert = new Alert(Alert.AlertType.ERROR);
        alert.setTitle("ERROR MESSAGE");
        alert.setContentText(errorMessage);
        alert.showAndWait(); // this shows up as an alert if you don't input a file
        // so proud of this fr fr
    }
}
