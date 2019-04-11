// TODO: main problem - listeners, because this script must be executed within listener



// before this the code of listeners will be executed and songUri is gonna be here

// songUri = 'https://firebasestorage.googleapis.com/v0/b/vocalistsbf.appspot.com/o/songs%2Fsample.mp3?alt=media&token=b626efc2-d80f-4e5e-94a8-8688776212bf';
function startSketch() {
	var sketch = function(p) {

		var song;
		var songHistory = [];
		var drawSongHistory = [];
		var source, fftSong, fftMic, myFilter, delta, humanPitchMax, humanPitchMin;
		
		// center clip nullifies samples below a clip amount
		var doCenterClip = true;
		var centerClipThreshold = 20.0;
		
		// normalize pre / post autocorrelation
		var preNormalize = true;
		var postNormalize = true;
		var micMin;

		p.preload = function() {
			// console.log(window.songUri);
			song = p.loadSound(uri); //database
			// song = loadSound('./sample.mp3');
		}
		
		p.setup = function() {
			p.createCanvas(p.windowWidth, p.windowHeight);
			p.noFill();
			p.textSize(24);
			p.textAlign(p.CENTER, p.CENTER);
			p.textFont('monospace');
		
			// magic numbers
			delta = 1; 
			micMin = 0; // TODO: find
			humanPitchMax = 108; // TODO: needs to be even less wide, about 3 octaves
			humanPitchMin = 21; 
		
			// to ease the analysis
			// songFilter = new p5.LowPass();
			// myFilter.disconnect();
		
			song.loop();  
			//TODO: filter connection
			// song.disconnect();
			// song.connect(songFilter);
		
			fftSong = new p5.FFT();
			fftSong.setInput(song);
		
			mic = new p5.AudioIn();
			// mic.connect(myFilter);
		
			fftMic = new p5.FFT();
			fftMic.setInput(mic);
		
			// mic.start();
			song.play();
		}
		
		p.draw = function() {
			p.background(255);
			p.noFill();
		
			// frequency analysis of the song
			var timeDomain = fftSong.waveform(1024, 'float32');
			var corrBuff = p.autoCorrelate(timeDomain);
				var midi = p.freqToMidi(p.findFrequency(corrBuff));
		
			// NaN and outliers control
				if (!isNaN(midi)) {
					if (p.isNotOutlier(songHistory, midi, delta)) {
						drawSongHistory.push(midi);
					}
					else {
						drawSongHistory.push(-1);
				}
				// to not get errors or more unnecessary outliers
					songHistory.push(midi);
			}
			
			// frequency analysis of the mic
			timeDomain = fftMic.waveform(1024, 'float32');
			corrBuff = p.autoCorrelate(timeDomain);
				midi = p.freqToMidi(p.findFrequency(corrBuff));
		
			// the voice visualization
			// TODO: when silent, then what? (it's going crazy)
			// could to like karaoke apps (filling with color, it would be easier to control noize probably)
			if (mic.getLevel() > micMin) { 
				var ey = p.map(midi, humanPitchMin, humanPitchMax, p.height, 0);
				p.ellipse(p.width / 2, ey, 10);
			}
		/*     begin playing and recording only when in the middle
				countdown? nope */
		
				p.beginShape();
				p.stroke(0);
				p.noFill();
				for (var i = 0; i < drawSongHistory.length - 3; i++) {
				// replacing outliner with next modo input
						if (drawSongHistory[i + 1] === -1) {
							drawSongHistory[i + 1] = drawSongHistory[i + 2]; 
				}
				// TODO: drawing some shape 
						var y = p.map(drawSongHistory[i], humanPitchMin, humanPitchMax, p.height, 0);
						p.point(i, y);
						
				}
				p.endShape();
		
				// get rid of first element
				if (drawSongHistory.length === p.width) {
						drawSongHistory.splice(0, 1);
				}
		}
		
		p.isNotOutlier = function(history, midi, delta) {
				// console.log(typeof history !== 'undefined');
			
				if ( typeof history != 'undefined' && history.length > 1 ) { 
					return p.abs(history[history.length - 1] - midi) < delta; }
				else {
					return true;
					} 
		} 
		
		// accepts a timeDomainBuffer and multiplies every value
		p.autoCorrelate = function(timeDomainBuffer) {
			
			var nSamples = timeDomainBuffer.length;
		
			// pre-normalize the input buffer
			if (preNormalize){
				timeDomainBuffer = p.normalize(timeDomainBuffer);
			}
		
			// zero out any values below the centerClipThreshold
			if (doCenterClip) {
				timeDomainBuffer = p.centerClip(timeDomainBuffer);
			}
		
			var autoCorrBuffer = [];
			for (var lag = 0; lag < nSamples; lag++){
				var sum = 0; 
				for (var index = 0; index < nSamples-lag; index++){
				var indexLagged = index+lag;
				var sound1 = timeDomainBuffer[index];
				var sound2 = timeDomainBuffer[indexLagged];
				var product = sound1 * sound2;
				sum += product;
				}
		
				// average to a value between -1 and 1
				autoCorrBuffer[lag] = sum/nSamples;
			}
		
			// normalize the output buffer
			if (postNormalize){
				autoCorrBuffer = p.normalize(autoCorrBuffer);
			}
		
			return autoCorrBuffer;
			}
		
		
			// Find the biggest value in a buffer, set that value to 1.0,
			// and scale every other value by the same amount.
		p.normalize = function(buffer) {
			var biggestVal = 0;
			var nSamples = buffer.length;
			for (var index = 0; index < nSamples; index++){
				if (p.abs(buffer[index]) > biggestVal){
				biggestVal = p.abs(buffer[index]);
				}
			}
			for (var index = 0; index < nSamples; index++){
		
				// divide each sample of the buffer by the biggest val
				buffer[index] /= biggestVal;
			}
			return buffer;
		}
		
		// Accepts a buffer of samples, and sets any samples whose
		// amplitude is below the centerClipThreshold to zero.
		// This factors them out of the autocorrelation.
		p.centerClip = function(buffer) {
			var nSamples = buffer.length;
		
			// center clip removes any samples whose abs is less than centerClipThreshold
			centerClipThreshold = p.map(p.mouseY, 0, p.height, 0,1); 
		
			if (centerClipThreshold > 0.0) {
				for (var i = 0; i < nSamples; i++) {
				var val = buffer[i];
				buffer[i] = (p.abs(val) > centerClipThreshold) ? val : 0;
				}
			}
			return buffer;
		}
		
		// Calculate the fundamental frequency of a buffer
		// by finding the peaks, and counting the distance
		// between peaks in samples, and converting that
		// number of samples to a frequency value.
		p.findFrequency = function(autocorr) {
		
			var nSamples = autocorr.length;
			var valOfLargestPeakSoFar = 0;
			var indexOfLargestPeakSoFar = -1;
		
			for (var index = 1; index < nSamples; index++){
				var valL = autocorr[index-1];
				var valC = autocorr[index];
				var valR = autocorr[index+1];
		
				var bIsPeak = ((valL < valC) && (valR < valC));
				if (bIsPeak){
					if (valC > valOfLargestPeakSoFar){
						valOfLargestPeakSoFar = valC;
						indexOfLargestPeakSoFar = index;
					}
				}
			}
			
			var distanceToNextLargestPeak = indexOfLargestPeakSoFar - 0;
		
			// convert sample count to frequency
			var fundamentalFrequency = p.sampleRate() / distanceToNextLargestPeak;
			return fundamentalFrequency;
		}
	}

	var mySketch = new p5(sketch);
}
