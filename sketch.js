function startSketch() {
	var sketch = function(p) {

		var song, audio;
		var songHistory = [];
		var drawSongHistory = [];
		var fftSong, fftMic, myFilter, delta, humanPitchMax, humanPitchMin, mistakeDelta;
		
		// center clip nullifies samples below a clip amount
		var doCenterClip = true;
		var centerClipThreshold = 20.0;
		
		// normalize pre / post autocorrelation
		var preNormalize = true;
		var postNormalize = true;
		var micMin;

		var counter, fullCounter, partCounter;
		// var uri = './lfv_string.mp3';

		p.preload = function() {
			song = p.loadSound(uri); //database
			audio = p.loadSound(uri);
		}
		
		p.setup = function() {
			// meh
			p.createCanvas(screen.availWidth, screen.availHeight);
			p.noFill();
			p.frameRate(30);
		
			// magic numbers
			delta = 1; 
			micMin = 0.1; // TODO: find
			humanPitchMax = 108; // TODO: needs to be even less wide, about 3 octaves
			humanPitchMin = 40; 
			mistakeDelta = 10;
			p.colorMode(p.HSB, 100, 100, 100);

			for (var i = 0; i < p.width / 2; i++){
				drawSongHistory.push(-2);
			}
			counter = 0;
			fullCounter = 0;
			partCounter = 0;
			// counter = 0;

			// to ease the analysis
			songFilter = new p5.LowPass();
			songFilter.disconnect();
			// song.loop();  
			//TODO: filter connection
			song.disconnect();
			song.connect(songFilter);
			// song.onended(() => {
			// 	for (var i = 0; i < p.width; i++){
			// 		drawSongHistory.push(-2);
			// 	}
			// });
		
			fftSong = new p5.FFT();
			fftSong.setInput(songFilter);
		
			mic = new p5.AudioIn();
			// mic.connect(myFilter);
		
			fftMic = new p5.FFT();
			fftMic.setInput(mic);
		
			// mic.disconnect();
			song.play();
		}
		
		p.draw = function() {
			// not really working
			if (counter > 0 && !song.isPlaying()) {
				drawSongHistory.push(-2);
				counter -= 1;
			}

			if (counter === p.width / 2) {
				audio.play();
				mic.start();
				counter += 1;
			}

			if (counter < p.width / 2) {
				counter += 1;
			}

			p.background(255);
			// here will be some kind of grid
			// in the left will be stats
			p.fill(0, 0, 0);
			p.rect(p.width / 2, 0, 1, p.height);
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
			micMidi = p.freqToMidi(p.findFrequency(corrBuff));
		
			var c = p.abs(drawSongHistory[0] - micMidi) > mistakeDelta ? 0 : p.map(p.abs(midi - micMidi), 0, mistakeDelta, 20, 0)
			p.fill(c, 100, 100);
			p.noStroke();

			if (mic.getLevel() > micMin) { 
				fullCounter += 1;
				partCounter += p.map(p.abs(drawSongHistory[0] - micMidi), 0, 20, 0, 1);

				p.textAlign(p.CENTER);
				p.text(100 * partCounter / fullCounter, p.width / 4, p.height / 2);

				var ey = p.map(micMidi, humanPitchMin, humanPitchMax, p.height, 0);
				p.ellipse(p.width / 2, ey, 10);
			}
		/*     begin playing and recording only when in the middle
				countdown? nope */
			// TODO: dynamic height
			// shapes?

			// p.stroke(0);
			// p.beginShape();
			for (var i = 0; i < drawSongHistory.length - 3; i++) {
			// replacing outliner with next modo input
				if (drawSongHistory[i + 1] === -1) {
					drawSongHistory[i + 1] = drawSongHistory[i + 2]; 
				}
			// TODO: drawing some shape 
				var y = p.map(drawSongHistory[i], humanPitchMin, humanPitchMax, p.height, 0);
				var brightness = i > p.width / 2 ? 100 : 30
				p.fill(0, 100, brightness);
				p.ellipse(i + p.width / 2, y, 1);					
			}
			// p.endShape();
	
			// get rid of first element
			if (drawSongHistory.length === p.width / 2) {
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
