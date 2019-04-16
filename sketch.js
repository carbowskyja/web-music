const colorCodes = [
	{color: 0, white: true},
	{color: 2, white: false},
	{color: 5, white: true},
	{color: 7, white: false},
	{color: 10, white: true},
	{color: 20, white: true},
	{color: 30, white: false},
	{color: 40, white: true},
	{color: 42, white: false},
	{color: 45, white: true},
	{color: 50, white: false},
	{color: 60, white: true}
]

function startSketch() {
	var sketch = function(p) {
		var song, audio;
		var songHistory = [];
		var drawSongHistory = [];
		var fftSong, fftMic, songFilter, recognitionDelta, humanPitchMax, humanPitchMin, mistakeDelta;
		
		// center clip nullifies samples below a clip amount
		var doCenterClip = true;
		var centerClipThreshold = 20.0;
		
		// normalize pre / post autocorrelation
		var preNormalize = true;
		var postNormalize = true;
		var micMin;

		// prev-post - for syncing the song, full/part - for stats
		var prevCounter, postCounter, fullCounter, partCounter;
		var blockWidth, blockCount, blockHeight;
		// var appWidth = 1080;
		// var appHeight = 1812;
		// var uri = './sample.mp3';
		alert(appWidth);

		p.preload = function() {
			song = p.loadSound(uri); //database
			audio = p.loadSound(uri);
		}
		
		p.setup = function() {
			p.createCanvas(appWidth, appHeight);
			p.noFill();
			p.frameRate(60);
			p.colorMode(p.HSB, 70, 100, 100);
			// magic numbers
			recognitionDelta = 1; 
			micMin = 0.1; // TODO: find
			humanPitchMax = 84; // TODO: needs to be even less wide, about 3 octaves (excluding)
			humanPitchMin = 36; 
			mistakeDelta = 10;

			blockHeight = p.map(humanPitchMax - 1, humanPitchMin, humanPitchMax, p.height, 0);
			blockWidth = blockHeight;
			blockCount = p.floor(p.width / blockWidth);
			// TODO: the height of rects should be estimated too!!!

			prevCounter = p.floor(blockCount / 2);
			postCounter = blockCount;

			for (var i = 0; i < blockCount - 1; i++){
				drawSongHistory.push(-2);
			}

			fullCounter = 0;
			partCounter = 0;

			// to ease the analysis
			songFilter = new p5.LowPass();
			songFilter.disconnect();

			song.disconnect();
			song.connect(songFilter);
		
			fftSong = new p5.FFT();
			fftSong.setInput(songFilter);
		
			mic = new p5.AudioIn();

			fftMic = new p5.FFT();
			fftMic.setInput(mic);

			song.play();
		}
		
		p.draw = function() {
			if (postCounter === 0) {
				postCounter -= 1;
			}

			if (postCounter > 0 && !song.isPlaying()) {
				postCounter -= 1;
			}

			if (prevCounter === 0) {
				audio.play();
				mic.start();
				prevCounter -= 1;
			}

			if (prevCounter > 0) {
				prevCounter -= 1;
			}

			p.background(50, 20, 60);
			// low sat piano grid
			p.noStroke();
			for (var i = 3; i < 7; i++) {
				for (var j = 0; j < 12; j++) {
					p.fill(50, 20, colorCodes[j].white ? 50 : 40);

					var y = p.map(i * 12 + j, humanPitchMin, humanPitchMax, p.height, 0);
					p.rect(0, y, p.width, blockHeight);
				}
			}
			p.fill(50, 20, 40);
			p.rect(p.width / 2, 0, 3, p.height);

			// frequency analysis of the song
			var timeDomain = fftSong.waveform(1024, 'float32');
			var corrBuff = p.autoCorrelate(timeDomain);
			var midi = p.freqToMidi(p.findFrequency(corrBuff));
		
			// NaN and outliers control
			if (!isNaN(midi)) {
				if (p.isNotOutlier(songHistory, midi, recognitionDelta)) {
					drawSongHistory.push(midi);
				}
				else {
					drawSongHistory.push(-1);
				}
			// to not get errors or more unnecessary outliers
				songHistory.push(midi);
			}
			else {
				drawSongHistory.push(-2);
			}
			
			
		/*     begin playing and recording only when in the middle */
			for (var i = 0; i < blockCount - 2; i++) {
			// replacing outliner with next midi input
				if (drawSongHistory[i + 1] === -1 && drawSongHistory[i + 2] !== -1) {
					drawSongHistory[i + 1] = drawSongHistory[i + 2]; 
				}  

				var y = p.map(drawSongHistory[i], humanPitchMin, humanPitchMax, p.height, 0);
				// var y = p.height - (drawSongHistory[i] - humanPitchMin) * (blockHeight + 1)
				if (drawSongHistory[i] < 0) {
					p.noFill();
					p.noStroke();
				}
				else {
					var code = colorCodes[drawSongHistory[i] % 12];
					p.fill(code.color, code.white ? 100 : 80, 100);
				}
				p.rect(i * blockWidth, y, blockWidth, blockHeight);					
			}

			// the bright piano grid
			for (var i = 3; i < 7; i++) {
				for (var j = 0; j < 12; j++) {
					p.fill(0, 0, colorCodes[j].white ? 100 : 0);

					var y = p.map(i * 12 + j, humanPitchMin, humanPitchMax, p.height, 0);
					p.rect(p.width - blockWidth * 3, y, blockWidth * 3, blockHeight);
				}
			}
				
			// frequency analysis of the mic
			timeDomain = fftMic.waveform(1024, 'float32');
			corrBuff = p.autoCorrelate(timeDomain);
			micMidi = p.freqToMidi(p.findFrequency(corrBuff));

			// mic drawing
			p.stroke(0);
			fullCounter += 1;
			if (mic.getLevel() > micMin && micMidi > 0) { 
				var code = colorCodes[micMidi % 12];
				p.fill(code.color, 100, 100); //TODO: color

				var mistake = p.abs(drawSongHistory[blockCount / 2] - micMidi);
				partCounter += (mistake <= mistakeDelta ? p.map(mistake, 0, mistakeDelta, 1, 0) : 0.5);

				var ey = p.map(micMidi, humanPitchMin, humanPitchMax, p.height, 0);
				p.ellipse(p.width / 2, ey + blockHeight / 2, blockHeight * 1.5);
			}

			// get rid of first element
			if (drawSongHistory.length >= blockCount) {
					drawSongHistory.splice(0, 1);
			}

			if (postCounter === -1) {
				p.clear();
				p.background(50, 20, 60);
				p.fill(0, 0, 0);
				p.textSize(100);
				p.textStyle(p.BOLD);
				p.textAlign(p.CENTER, p.CENTER);

				var percent = p.round(100 * (partCounter / fullCounter));
				p.text('Keep up the good work!\nYour score: ' + percent + '%', p.width / 2, p.height / 2);
				p.noLoop();
				ReactNativeWebView.postMessage(percent.toString());
			}
		}

		p.isNotOutlier = function(history, midi, recognitionDelta) {		
			if ( typeof history != 'undefined' && history.length > 1 ) { 
				return p.abs(history[history.length - 1] - midi) < recognitionDelta; 
			}
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
			// and blockWidth every other value by the same amount.
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
