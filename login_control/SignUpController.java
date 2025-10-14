package com.example.identification;


import javafx.event.ActionEvent;
import javafx.event.EventHandler;
import javafx.fxml.FXML;
import javafx.fxml.FXMLLoader;
import javafx.scene.Node;
import javafx.scene.Parent;
import javafx.scene.Scene;
import javafx.scene.control.PasswordField;
import javafx.scene.control.TextField;
import javafx.stage.Stage;
import javafx.scene.control.Button;

import javax.crypto.BadPaddingException;
import javax.crypto.IllegalBlockSizeException;
import javax.crypto.NoSuchPaddingException;
import java.awt.*;
import java.io.BufferedWriter;
import java.io.FileWriter;
import java.io.IOException;
import java.security.InvalidKeyException;
import java.security.NoSuchAlgorithmException;

import static com.example.identification.Encryption.*;

public class SignUpController extends HelloController {

    @FXML
    public javafx.scene.control.TextField textName;
    @FXML
    public javafx.scene.control.TextField textEmail;
    @FXML
    public Button signupConfirm;
    @FXML
    public PasswordField textFieldPassword;

    @FXML
    private void setOnAction(ActionEvent actionEvent) throws IOException, NoSuchPaddingException, IllegalBlockSizeException, NoSuchAlgorithmException, BadPaddingException, InvalidKeyException {

        String nameText = textName.getText();
        String emailText = textEmail.getText();
        String passwordText = textFieldPassword.getText();

        // encrypt the name and email
            String encryptedName = encrypt(nameText);
            String encryptedEmail = encrypt(emailText);
            String salt = getSalt();
            String hashedPassword = hashPassword(passwordText, salt);

            // UserData.setUserData(encryptedName, encryptedEmail, hashedPassword, salt);

            // Writing the encrypted data into a file
            String fileName = "users.txt";
            BufferedWriter writer = new BufferedWriter(new FileWriter(fileName, true));


            writer.write("Name,Email,Password,Salt\n");
            writer.write(encryptedName + "," + encryptedEmail + "," + hashedPassword + "," + salt +"\n");
            writer.newLine();
            writer.close();

            // this will load the fxml file using a try catch for errors
            FXMLLoader fxmlLoader = new FXMLLoader(HelloApplication.class.getResource("hello-view.fxml"));
            Parent root = fxmlLoader.load();

            // this will get the current stage to be able to switch stages
            Node signUpButton = (Node) actionEvent.getSource();
            Stage stage = (Stage) signUpButton.getScene().getWindow();

            // this is setting the new scene to the stage
            Scene scene = new Scene(root);
            stage.setScene(scene);
    }
}

