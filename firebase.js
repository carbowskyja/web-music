// Initialize Firebase
var config = {
    apiKey: "AIzaSyDb0nJRpLzu9Vt5ZHY1k4aI3-QaWXjCntY",
    authDomain: "vocalistsbf.firebaseapp.com",
    databaseURL: "https://vocalistsbf.firebaseio.com",
    projectId: "vocalistsbf",
    storageBucket: "vocalistsbf.appspot.com",
    messagingSenderId: "715722924968"
};
firebase.initializeApp(config);

var firestore = firebase.firestore();
var storage = firebase.storage();
// var songUri;

var songRef = firestore.collection("songs").doc("0")
songRef.get().then(function(doc) {
    if (doc.exists) {
        // var path = storage.ref(doc.data().song);
        // var path = storage.ref('/songs/sample.mp3');
        // // console.log(path);
		// path.getDownloadURL().then(function(url) {
        //     window.songUri = url;
        // });
        window.songUri = dog.data().song;
    } else {
        console.log("No such document!");
    }
});