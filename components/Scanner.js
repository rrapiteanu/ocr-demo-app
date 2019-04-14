import React from "react";
import { Camera, Permissions } from "expo";

import * as firebase from "firebase";
import uuid from "uuid";
import axios from "axios";

import {
  Alert,
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  TouchableHighlight,
  Dimensions,
  Image
} from "react-native";

const firebaseConfig = {
  apiKey: "AIzaSyBFoQX5o9ypfA0_IoQSuRn3bTbUU87qZFE",
  authDomain: "workleto-ocr.firebaseapp.com",
  databaseURL: "https://workleto-ocr.firebaseio.com",
  projectId: "workleto-ocr",
  storageBucket: "workleto-ocr.appspot.com",
  messagingSenderId: "667136306393"
};

if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

export default class Scanner extends React.Component {
  state = {
    hasCameraPermission: null,
    type: Camera.Constants.Type.back,
    image: null,
    isExtracting: false,
    text: "",
    uploading: false
  };

  async componentDidMount() {
    const { status } = await Permissions.askAsync(Permissions.CAMERA);
    this.setState({ hasCameraPermission: status === "granted" });
  }

  snap = async () => {
    if (this.camera) {
      console.log("Taking photo");
      this.setState({ uploading: true, text: "", image: null });
      const photo = await this.camera.takePictureAsync();
      const uploadedURL = await this.uploadImageAsync(photo.uri);
      this.setState({ image: photo.uri, uploading: false, isExtracting: true });
      // console.log(uploadedURL);
      const response = await axios.post(
        "https://lucky-elephant-56.localtunnel.me/ocr",
        { url: uploadedURL }
      );

      this.setState({ isExtracting: false });
      console.log(typeof response.data);
      if (typeof response.data === "string") {
        this.setState({ text: response.data });
      } else {
        this.setState({ text: "No text found! Try again!" });
      }
    }
  };

  uploadImageAsync = async uri => {
    const blob = await new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.onload = function() {
        resolve(xhr.response);
      };
      xhr.onerror = function(e) {
        console.log(e);
        reject(new TypeError("Network request failed"));
      };
      xhr.responseType = "blob";
      xhr.open("GET", uri, true);
      xhr.send(null);
    });

    const ref = firebase
      .storage()
      .ref("images")
      .child(uuid.v4());

    const snapshot = await ref.put(blob);
    blob.close();

    return await snapshot.ref.getDownloadURL();
  };

  maybeRenderUploadingOverlay = () => {
    if (this.state.uploading) {
      return (
        <View
          style={[
            StyleSheet.absoluteFill,
            {
              backgroundColor: "rgba(0,0,0,0.4)",
              alignItems: "center",
              justifyContent: "center"
            }
          ]}
        >
          <ActivityIndicator color="#fff" animating size="large" />
        </View>
      );
    }
  };

  render() {
    const { hasCameraPermission, image } = this.state;
    const { height, width } = Dimensions.get("window");
    const maskRowHeight = Math.round((height - 300) / 20);
    const maskColWidth = (width - 300) / 2;

    if (hasCameraPermission === null) {
      return <View />;
    } else if (hasCameraPermission === false) {
      return <Text>No access to camera</Text>;
    } else {
      return (
        <View style={styles.container}>
          <Camera
            type={this.state.type}
            ref={cam => {
              this.camera = cam;
            }}
            style={styles.cameraView}
          >
            <View style={styles.maskOutter}>
              <View
                style={[
                  { flex: maskRowHeight },
                  styles.maskRow,
                  styles.maskFrame
                ]}
              />

              <View style={[{ flex: 30 }, styles.maskCenter]}>
                <View style={[{ width: maskColWidth }, styles.maskFrame]} />
                <View style={styles.maskInner} />
                <View style={[{ width: maskColWidth }, styles.maskFrame]} />
              </View>
              <View
                style={[
                  { flex: maskRowHeight },
                  styles.maskRow,
                  styles.maskFrame
                ]}
              >
                {!this.state.uploading && (
                  <TouchableOpacity
                    style={{
                      width: 60,
                      height: 60,
                      borderRadius: 30,
                      backgroundColor: "#fff"
                    }}
                    onPress={this.snap}
                  />
                )}
                {this.maybeRenderUploadingOverlay()}
              </View>
            </View>
          </Camera>
          <Modal
            animationType="slide"
            transparent={false}
            visible={this.state.image !== null}
            onRequestClose={() => {
              alert("Modal has been closed.");
            }}
          >
            <View style={{ marginTop: 22 }}>
              <View>
                <TouchableHighlight
                  onPress={() => {
                    this.setState({ image: null });
                  }}
                >
                  <Text>Hide Modal</Text>
                </TouchableHighlight>
              </View>
              <View>
                <Image
                  style={{ width: 400, height: 400 }}
                  source={{
                    uri: this.state.image
                  }}
                />

                {this.state.isExtracting && (
                  <ActivityIndicator color="black" animating size="large" />
                )}
                <ScrollView style={{ padding: 20 }}>
                  {this.state.text !== "" && <Text>{this.state.text}</Text>}
                </ScrollView>
              </View>
            </View>
          </Modal>
        </View>
      );
    }
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1
  },
  cameraView: {
    flex: 1,
    justifyContent: "flex-start"
  },
  maskOutter: {
    position: "absolute",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "space-around"
  },
  maskInner: {
    width: 300,
    backgroundColor: "transparent",
    borderColor: "white",
    borderWidth: 1
  },
  maskFrame: {
    backgroundColor: "rgba(1,1,1,0.6)"
  },
  maskRow: {
    width: "100%"
  },
  maskCenter: { flexDirection: "row" }
});
