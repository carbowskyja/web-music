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

var songRef = firestore.collection("songs")
songRef.doc("SF").set({
    name: "San Francisco", state: "CA", country: "USA",
    capital: false, population: 860000,
    regions: ["west_coast", "norcal"] });

docRef = firestore.collection("songs").doc("SF");
docRef.get().then(function(doc) {
    if (doc.exists) {
        console.log("Document data:", doc.data());
    } else {
        // doc.data() will be undefined in this case
        console.log("No such document!");
    }
});